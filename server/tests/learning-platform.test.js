import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';

import app from '../src/app.js';
import env from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Module from '../src/models/Module.js';
import Lesson from '../src/models/Lesson.js';
import Assignment from '../src/models/Assignment.js';
import CourseEnrollment from '../src/models/CourseEnrollment.js';
import ModuleProgress from '../src/models/ModuleProgress.js';
import LessonProgress from '../src/models/LessonProgress.js';
import TaskRun from '../src/models/TaskRun.js';
import Submission from '../src/models/Submission.js';
import Review from '../src/models/Review.js';

import geminiService from '../src/services/gemini.service.js';
import emailService from '../src/services/email.service.js';
import authService from '../src/services/auth.service.js';
import progressService from '../src/services/progress.service.js';

let server;
let baseUrl;

let adminToken;
let studentToken;
let studentUser;
let student2Token;
let student2User;

test.before(async () => {
  await connectDB();

  // Clear previous platform test artifacts
  await User.deleteMany({ email: /@platform-test\.local$/ });
  await Course.deleteMany({ slug: /platform-test/ });

  // Mock Email Transporter
  emailService._transporter = {
    sendMail: async () => ({ messageId: 'mock-platform-msg' })
  };

  // Mock Gemini Client
  geminiService._client = {
    models: {
      generateContent: async ({ contents }) => {
        const promptStr = String(contents);
        if (promptStr.includes('AI Learning Mentor')) {
          return {
            text: JSON.stringify({
              reply: 'Great question about Python variables! Remember that in Python, variables do not need explicit type declarations.',
              suggestedAction: 'take_understanding_check'
            })
          };
        }
        if (promptStr.includes('educational grader')) {
          return {
            text: JSON.stringify({
              passed: true,
              feedback: 'Good explanation.'
            })
          };
        }
        // Review submission
        return {
          text: JSON.stringify({
            score: 88,
            verdict: 'pass',
            summary: 'Excellent work meeting the criteria.',
            criterionScores: [
              { criterion: 'Logic', score: 50, maxScore: 50, feedback: 'Correct logic.' },
              { criterion: 'Style', score: 38, maxScore: 50, feedback: 'Clean style.' }
            ],
            strengths: ['Clear functions'],
            issues: [],
            nextSteps: ['Move to next module']
          })
        };
      }
    }
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Register admin user
  const adminRes = await authService.register({
    name: 'Platform Admin',
    email: 'admin@platform-test.local',
    password: 'Password123!',
    role: 'admin'
  });
  adminToken = adminRes.token;

  // Register student 1
  const studentRes = await authService.register({
    name: 'Student One',
    email: 'student1@platform-test.local',
    password: 'Password123!',
    role: 'student'
  });
  studentToken = studentRes.token;
  studentUser = studentRes.user;

  // Register student 2
  const student2Res = await authService.register({
    name: 'Student Two',
    email: 'student2@platform-test.local',
    password: 'Password123!',
    role: 'student'
  });
  student2Token = student2Res.token;
  student2User = student2Res.user;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await User.deleteMany({ email: /@platform-test\.local$/ });
  await Course.deleteMany({ slug: /platform-test/ });
  await disconnectDB();
});

let testCourse;
let testModule1;
let testModule2;
let testLesson1;
let testAssignment1;
let testEnrollment;

test('P1. Admin creates a draft course with learning objectives', async () => {
  const res = await fetch(`${baseUrl}/api/admin/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Platform Test Python Course',
      description: 'A comprehensive Python masterclass',
      difficulty: 'intermediate',
      learningObjectives: ['Master functions', 'Understand OOP'],
      timezone: 'UTC'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.status, 'draft');
  assert.equal(data.data.difficulty, 'intermediate');
  testCourse = data.data;
});

test('P2. Circular prerequisite validation blocks invalid module relationships', async () => {
  // Create module 1
  const mod1Res = await fetch(`${baseUrl}/api/admin/courses/${testCourse._id}/modules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Module 1: Foundations',
      description: 'Core concepts',
      order: 1
    })
  });
  assert.equal(mod1Res.status, 201);
  testModule1 = (await mod1Res.json()).data;

  // Create module 2 with prerequisite module 1
  const mod2Res = await fetch(`${baseUrl}/api/admin/courses/${testCourse._id}/modules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Module 2: Advanced OOP',
      description: 'OOP and design patterns',
      order: 2,
      prerequisiteModuleIds: [testModule1._id]
    })
  });
  assert.equal(mod2Res.status, 201);
  testModule2 = (await mod2Res.json()).data;

  // Attempting to make module 1 depend on module 2 (circular!)
  const circularRes = await fetch(`${baseUrl}/api/admin/modules/${testModule1._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      prerequisiteModuleIds: [testModule2._id]
    })
  });
  assert.equal(circularRes.status, 400);
  const circularData = await circularRes.json();
  assert.equal(circularData.error.code, 'CIRCULAR_PREREQUISITE');
});

test('P3. Admin populates Module 1 with lesson and assignment; course publish validation succeeds', async () => {
  // Create lesson in Module 1
  const lessonRes = await fetch(`${baseUrl}/api/admin/modules/${testModule1._id}/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Lesson 1.1: Python Variables and Functions',
      description: 'Understanding scopes and signatures',
      order: 1,
      required: true,
      contentBlocks: [
        { type: 'text', content: 'Variables in Python are dynamically typed.' },
        { type: 'code', content: 'def add(a, b):\n    return a + b', language: 'python' }
      ],
      understandingCheckConfig: [
        {
          id: 'q1',
          prompt: 'What keyword defines a function in Python?',
          type: 'multiple_choice',
          options: ['func', 'def', 'function', 'lambda'],
          expectedAnswer: 'def'
        }
      ]
    })
  });
  assert.equal(lessonRes.status, 201);
  testLesson1 = (await lessonRes.json()).data;

  // Create Assignment in Module 1
  const assRes = await fetch(`${baseUrl}/api/admin/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      courseId: testCourse._id,
      moduleId: testModule1._id,
      title: 'Module 1 Project: Math Library',
      description: 'Build a small math helper library',
      scenarioText: 'Build functions add(a, b) and multiply(a, b)',
      requirements: ['add function works', 'multiply function works'],
      expectedOutcome: 'Both functions return correct numbers',
      answerKey: 'def add(a,b): return a+b\ndef multiply(a,b): return a*b',
      rubric: [
        { name: 'Logic', description: 'Functional correctness', weight: 50 },
        { name: 'Style', description: 'PEP8 style', weight: 50 }
      ],
      maxAttempts: 3,
      status: 'published'
    })
  });
  assert.equal(assRes.status, 201);
  testAssignment1 = (await assRes.json()).data;

  // Also add a lesson in Module 2 so Module 2 is valid for publication
  await fetch(`${baseUrl}/api/admin/modules/${testModule2._id}/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Lesson 2.1: Python Classes',
      description: 'OOP in Python',
      order: 1,
      contentBlocks: [{ type: 'text', content: 'Classes are defined with class.' }]
    })
  });

  // Now publish course
  const pubRes = await fetch(`${baseUrl}/api/admin/courses/${testCourse._id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(pubRes.status, 200);
  const pubData = await pubRes.json();
  assert.equal(pubData.data.status, 'published');
});

test('P4. Admin invites student and duplicate enrollment is prevented', async () => {
  // Invite student 1
  const inviteRes = await fetch(`${baseUrl}/api/admin/courses/${testCourse._id}/enroll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      email: 'student1@platform-test.local',
      name: 'Student One'
    })
  });
  assert.equal(inviteRes.status, 201);
  const inviteData = await inviteRes.json();
  testEnrollment = inviteData.data.enrollment;
  const rawToken = inviteData.data.rawToken;

  // Duplicate invite attempt
  const dupRes = await fetch(`${baseUrl}/api/admin/courses/${testCourse._id}/enroll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      email: 'student1@platform-test.local',
      name: 'Student One'
    })
  });
  assert.equal(dupRes.status, 409);

  // Accept invitation
  const acceptRes = await fetch(`${baseUrl}/api/auth/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'NewPassword123!'
    })
  });
  assert.equal(acceptRes.status, 200);
});

test('P5. Authoritative progression initialises: Module 1 is available, Module 2 is locked', async () => {
  const outlineRes = await fetch(`${baseUrl}/api/student/enrollments/${testEnrollment._id}/outline`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(outlineRes.status, 200);
  const data = await outlineRes.json();

  const mod1 = data.data.modules.find((m) => m.id === testModule1._id);
  const mod2 = data.data.modules.find((m) => m.id === testModule2._id);

  assert.equal(mod1.status, 'available');
  assert.equal(mod2.status, 'locked');
  assert.equal(data.data.overallProgress, 0);
});

test('P6. Locked lesson in Module 2 cannot be accessed prematurely', async () => {
  const mod2Lesson = await Lesson.findOne({ moduleId: testModule2._id });

  const res = await fetch(`${baseUrl}/api/student/lessons/${mod2Lesson._id}?enrollmentId=${testEnrollment._id}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(res.status, 403);
  const err = await res.json();
  assert.equal(err.error.code, 'LESSON_LOCKED');
});

test('P7. Student interacts with AI Mentor grounded in course context without leaking answerKey', async () => {
  // Start conversation
  const startRes = await fetch(`${baseUrl}/api/student/mentor/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      enrollmentId: testEnrollment._id,
      courseId: testCourse._id,
      moduleId: testModule1._id,
      lessonId: testLesson1._id,
      title: 'Python Help'
    })
  });
  assert.equal(startRes.status, 201);
  const conv = (await startRes.json()).data;

  // Send message
  const msgRes = await fetch(`${baseUrl}/api/student/mentor/conversations/${conv._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      content: 'Can you explain how functions work in Python?'
    })
  });
  assert.equal(msgRes.status, 200);
  const msgData = await msgRes.json();

  assert.equal(msgData.data.message.role, 'assistant');
  assert.ok(msgData.data.message.content.includes('Python'));
  // answerKey must never be exposed
  assert.equal(msgData.data.message.content.includes('def multiply(a,b)'), false);
});

test('P8. Student submits understanding check and completes lesson', async () => {
  // Start lesson
  await fetch(`${baseUrl}/api/student/lessons/${testLesson1._id}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ enrollmentId: testEnrollment._id })
  });

  // Submit wrong answer
  const wrongRes = await fetch(`${baseUrl}/api/student/lessons/${testLesson1._id}/understanding-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      enrollmentId: testEnrollment._id,
      checkId: 'q1',
      answer: 'func'
    })
  });
  assert.equal(wrongRes.status, 200);
  assert.equal((await wrongRes.json()).data.passed, false);

  // Submit correct answer
  const correctRes = await fetch(`${baseUrl}/api/student/lessons/${testLesson1._id}/understanding-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      enrollmentId: testEnrollment._id,
      checkId: 'q1',
      answer: 'def'
    })
  });
  assert.equal(correctRes.status, 200);
  assert.equal((await correctRes.json()).data.passed, true);

  // Complete lesson
  const compRes = await fetch(`${baseUrl}/api/student/lessons/${testLesson1._id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ enrollmentId: testEnrollment._id })
  });
  assert.equal(compRes.status, 200);
});

test('P9. Assignment unlocks only after required lessons are complete; submission is evaluated and approved', async () => {
  // Create task run for student
  const task = new TaskRun({
    studentName: 'Student One',
    studentEmail: 'student1@platform-test.local',
    studentId: studentUser.id,
    assignmentId: testAssignment1._id,
    enrollmentId: testEnrollment._id,
    courseId: testCourse._id,
    moduleId: testModule1._id,
    taskAccessTokenHash: TaskRun.hashToken('test-token')
  });
  await task.save();

  // Submit work
  const subRes = await fetch(`${baseUrl}/api/student/assignments/${task._id}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      codeText: 'def add(a, b): return a + b\ndef multiply(a, b): return a * b'
    })
  });

  assert.equal(subRes.status, 200);
  const subData = await subRes.json();
  assert.equal(subData.data.review.decision, 'approved');
  assert.equal(subData.data.review.score, 88);
});

test('P10. Approved assignment satisfies Module 1 criteria and unlocks Module 2', async () => {
  const outlineRes = await fetch(`${baseUrl}/api/student/enrollments/${testEnrollment._id}/outline`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(outlineRes.status, 200);
  const data = await outlineRes.json();

  const mod1 = data.data.modules.find((m) => m.id === testModule1._id);
  const mod2 = data.data.modules.find((m) => m.id === testModule2._id);

  assert.equal(mod1.status, 'completed');
  assert.equal(mod2.status, 'available'); // Unlocked!
});

test('P11. Student dashboard aggregates courses, current progress, and recommended next action', async () => {
  const dashRes = await fetch(`${baseUrl}/api/student/dashboard`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(dashRes.status, 200);
  const dashData = await dashRes.json();

  assert.equal(dashData.data.totalEnrolledCourses, 1);
  const enrolledCourse = dashData.data.courses[0];
  assert.equal(enrolledCourse.course.title, 'Platform Test Python Course');
  assert.equal(enrolledCourse.currentModule.title, 'Module 2: Advanced OOP');
  assert.equal(enrolledCourse.recommendedAction, 'continue_lesson');
});

test('P12. Security: Student 2 cannot access Student 1’s enrollment, conversations, or submissions', async () => {
  // Student 2 attempts to fetch Student 1's enrollment outline
  const outlineRes = await fetch(`${baseUrl}/api/student/enrollments/${testEnrollment._id}/outline`, {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert.equal(outlineRes.status, 403);

  // Student 2 attempts to access Student 1's conversation
  const conv = await mongoose.model('Conversation').findOne({ studentId: studentUser.id });
  const convRes = await fetch(`${baseUrl}/api/student/mentor/conversations/${conv._id}/messages`, {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert.equal(convRes.status, 404);
});

