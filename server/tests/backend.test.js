import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';

import app from '../src/app.js';
import env from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Assignment from '../src/models/Assignment.js';
import TaskRun from '../src/models/TaskRun.js';
import Submission from '../src/models/Submission.js';
import Review from '../src/models/Review.js';
import EmailLog from '../src/models/EmailLog.js';
import geminiService, { reviewOutputSchema } from '../src/services/gemini.service.js';
import emailService from '../src/services/email.service.js';
import workflowService from '../src/services/workflow.service.js';

import { sampleAssignmentData, sampleNextAssignmentData } from './fixtures/sampleAssignment.js';
import { sampleValidReview, sampleInvalidReviewMissingScore } from './fixtures/sampleReview.js';

let server;
let baseUrl;

// Setup test database & server
test.before(async () => {
  await connectDB();
  // Clear any existing test data if needed
  await Assignment.deleteMany({ title: /Build a Secure REST API/ });
  await TaskRun.deleteMany({ studentEmail: /@test\.local$/ });

  // Start HTTP server on random free port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await Assignment.deleteMany({ title: /Build a Secure REST API/ });
  await TaskRun.deleteMany({ studentEmail: /@test\.local$/ });
  await disconnectDB();
});

// Mock Email Transporter to prevent real network calls
const mockSentEmails = [];
emailService._transporter = {
  sendMail: async (options) => {
    mockSentEmails.push(options);
    return { messageId: 'mock-msg-id-123' };
  }
};

// Mock Gemini Client to avoid external API calls and rate limits during test run
geminiService._client = {
  models: {
    generateContent: async () => ({
      text: JSON.stringify(sampleValidReview)
    })
  }
};

test('1. Health endpoint returns 200 and services status without leaking secrets', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.data.status, 'healthy');
  assert.ok(data.data.services.database);
  assert.equal(typeof data.data.services.gemini.configured, 'boolean');
  // Secrets must never be exposed
  assert.equal(data.data.services.gemini.apiKey, undefined);
  assert.equal(data.data.services.email.password, undefined);
});

test('2. Invalid assignment payloads are rejected with 400', async () => {
  const invalidPayload = {
    title: 'Missing other fields'
  };

  const res = await fetch(`${baseUrl}/api/admin/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': env.ADMIN_API_KEY
    },
    body: JSON.stringify(invalidPayload)
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'VALIDATION_ERROR');
});

test('3. Rubric-weight validation rejects criteria weights not summing to 100', async () => {
  const badRubricPayload = {
    ...sampleAssignmentData,
    rubric: [
      { name: 'Part 1', weight: 40 },
      { name: 'Part 2', weight: 40 } // sums to 80, not 100
    ]
  };

  const res = await fetch(`${baseUrl}/api/admin/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': env.ADMIN_API_KEY
    },
    body: JSON.stringify(badRubricPayload)
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'INVALID_RUBRIC_WEIGHTS');
});

test('4. Authentication failure on administrator routes when header is missing or invalid', async () => {
  // Missing key header
  const resNoKey = await fetch(`${baseUrl}/api/admin/assignments`);
  assert.equal(resNoKey.status, 401);

  // Wrong key header
  const resWrongKey = await fetch(`${baseUrl}/api/admin/assignments`, {
    headers: { 'x-admin-api-key': 'wrong-password-xyz' }
  });
  assert.equal(resWrongKey.status, 401);
});

test('5. Authentication failure for student task tokens when token is missing or invalid', async () => {
  const fakeTaskId = new mongoose.Types.ObjectId().toString();

  // Missing token
  const resNoToken = await fetch(`${baseUrl}/api/tasks/${fakeTaskId}`);
  assert.equal(resNoToken.status, 401);

  // Invalid token against an existing task
  const testTask = await TaskRun.create({
    studentName: 'Auth Test Student',
    studentEmail: 'authtest@test.local',
    assignmentId: new mongoose.Types.ObjectId(),
    taskAccessTokenHash: TaskRun.hashToken('correct-token-123')
  });

  const resInvalidToken = await fetch(`${baseUrl}/api/tasks/${testTask._id}`, {
    headers: { Authorization: 'Bearer definitely-invalid-token' }
  });
  assert.equal(resInvalidToken.status, 401);

  await TaskRun.deleteOne({ _id: testTask._id });
});

test('6. Student task responses NEVER expose private answerKey', async () => {
  // Create published assignment
  const nextAss = await Assignment.create(sampleNextAssignmentData);
  const assignment = await Assignment.create({
    ...sampleAssignmentData,
    nextAssignmentId: nextAss._id
  });

  // Assign to student
  const assignResult = await workflowService.assignTaskToStudent({
    assignmentId: assignment._id,
    studentName: 'Alice Student',
    studentEmail: 'alice@test.local'
  });

  const rawToken = assignResult.rawToken;
  const taskId = assignResult.taskRunId;

  // Fetch as student
  const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${rawToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.data.assignment.title, sampleAssignmentData.title);
  // Crucial security check: answerKey must NOT exist in student response
  assert.equal(data.data.assignment.answerKey, undefined);
  assert.equal(data.data.answerKey, undefined);
});

test('7. Invalid TaskRun state transitions are rejected', async () => {
  const task = new TaskRun({
    studentName: 'Bob Student',
    studentEmail: 'bob@test.local',
    assignmentId: new mongoose.Types.ObjectId(),
    status: 'assigned',
    taskAccessTokenHash: 'dummyhash'
  });

  // Attempt direct illegal jump from 'assigned' to 'reviewed'
  assert.equal(task.canTransitionTo('reviewed'), false);
  assert.throws(() => task.transitionTo('reviewed'), /Invalid status transition/);

  // Valid transition to 'briefing_completed'
  assert.equal(task.canTransitionTo('briefing_completed'), true);
  task.transitionTo('briefing_completed');
  assert.equal(task.status, 'briefing_completed');
  assert.ok(task.briefingCompletedAt);
});

test('8. Submission validation rejects missing codeText', async () => {
  const assignment = await Assignment.findOne({ title: sampleAssignmentData.title });
  const assignResult = await workflowService.assignTaskToStudent({
    assignmentId: assignment._id,
    studentName: 'Charlie Student',
    studentEmail: 'charlie@test.local'
  });

  const res = await fetch(`${baseUrl}/api/tasks/${assignResult.taskRunId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${assignResult.rawToken}`
    },
    body: JSON.stringify({ codeText: '   ' }) // whitespace only
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('9. Invalid Gemini output schema is rejected by Zod schema validation', () => {
  const result = reviewOutputSchema.safeParse(sampleInvalidReviewMissingScore);
  assert.equal(result.success, false);

  const validResult = reviewOutputSchema.safeParse(sampleValidReview);
  assert.equal(validResult.success, true);
});

test('10. Duplicate review requests return existing review without re-evaluating or creating duplicate reviews', async () => {
  const assignment = await Assignment.findOne({ title: sampleAssignmentData.title });
  const assignResult = await workflowService.assignTaskToStudent({
    assignmentId: assignment._id,
    studentName: 'David Student',
    studentEmail: 'david@test.local'
  });

  const validSubmission = {
    codeText: 'const express = require("express"); app.get("/api/notes", (req, res) => res.json([]));'
  };

  // First submission & evaluation
  const firstRes = await fetch(`${baseUrl}/api/tasks/${assignResult.taskRunId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${assignResult.rawToken}`
    },
    body: JSON.stringify(validSubmission)
  });

  assert.equal(firstRes.status, 200);
  const firstData = await firstRes.json();
  assert.equal(firstData.success, true);
  assert.ok(firstData.data.review);

  // Duplicate submission attempt
  const secondRes = await fetch(`${baseUrl}/api/tasks/${assignResult.taskRunId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${assignResult.rawToken}`
    },
    body: JSON.stringify(validSubmission)
  });

  assert.equal(secondRes.status, 200);
  const secondData = await secondRes.json();
  assert.equal(secondData.success, true);
  assert.equal(secondData.data.isExisting, true);

  // Check database count for this task run
  const reviewCount = await Review.countDocuments({ taskRunId: assignResult.taskRunId });
  assert.equal(reviewCount, 1);
});

test('11. Failed email delivery is recorded in EmailLog and is recoverable via retry', async () => {
  // Create an email log in failed state
  const dummyTaskRunId = new mongoose.Types.ObjectId();
  const dummySubmissionId = new mongoose.Types.ObjectId();
  const eventKey = `test_failure_${Date.now()}`;

  const failedLog = await EmailLog.create({
    eventKey,
    taskRunId: dummyTaskRunId,
    submissionId: dummySubmissionId,
    emailType: 'review',
    recipient: 'student-fail@test.local',
    status: 'failed',
    attemptCount: 1,
    lastError: 'SMTP connect timeout'
  });

  assert.equal(failedLog.status, 'failed');
  assert.equal(failedLog.attemptCount, 1);

  // Retrying the email
  const retryResult = await emailService._sendWithTracking({
    eventKey,
    taskRunId: dummyTaskRunId,
    submissionId: dummySubmissionId,
    emailType: 'review',
    recipient: 'student-fail@test.local',
    subject: 'Test Retry',
    text: 'Test message',
    html: '<p>Test message</p>'
  });

  assert.equal(retryResult.success, true);
  const updatedLog = await EmailLog.findOne({ eventKey });
  assert.equal(updatedLog.status, 'sent');
  assert.equal(updatedLog.attemptCount, 2);
  assert.ok(updatedLog.sentAt);

  // Clean up
  await EmailLog.deleteOne({ eventKey });
});

test('12. Next assignment is only released AFTER review is saved', async () => {
  const nextAss = await Assignment.create({
    ...sampleNextAssignmentData,
    title: `Next Assignment ${Date.now()}`
  });

  const assignment = await Assignment.create({
    ...sampleAssignmentData,
    title: `Assignment with Next ${Date.now()}`,
    nextAssignmentId: nextAss._id
  });

  const assignResult = await workflowService.assignTaskToStudent({
    assignmentId: assignment._id,
    studentName: 'Eve Student',
    studentEmail: 'eve@test.local'
  });

  // Verify next task does NOT exist before submission
  const priorNextTasks = await TaskRun.find({
    studentEmail: 'eve@test.local',
    assignmentId: nextAss._id
  });
  assert.equal(priorNextTasks.length, 0);

  // Complete briefing and submit
  await workflowService.completeBriefing(assignResult.taskRunId);

  const submissionResult = await workflowService.processSubmission({
    taskRunId: assignResult.taskRunId,
    codeText: 'console.log("Eve code");'
  });

  assert.ok(submissionResult.review);
  assert.ok(submissionResult.nextAssignment);
  assert.equal(submissionResult.nextAssignment.nextAssignmentTitle, nextAss.title);

  // Now verify next task was created
  const afterNextTasks = await TaskRun.find({
    studentEmail: 'eve@test.local',
    assignmentId: nextAss._id
  });
  assert.equal(afterNextTasks.length, 1);
  assert.equal(afterNextTasks[0].status, 'assigned');
});
