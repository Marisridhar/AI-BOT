import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import TaskRun from '../models/TaskRun.js';
import Submission from '../models/Submission.js';
import Review from '../models/Review.js';
import geminiService from './gemini.service.js';
import emailService from './email.service.js';
import { AppError } from '../utils/AppError.js';

export class WorkflowService {
  async assignTaskToStudent({ assignmentId, studentName, studentEmail }) {
    if (!studentName || !studentEmail) {
      throw new AppError('Student name and email are required', 400, 'VALIDATION_ERROR');
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw new AppError('Invalid assignment ID format', 400, 'INVALID_ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    if (assignment.status !== 'published') {
      throw new AppError(
        'Cannot assign a draft or unpublished assignment. Please publish it first.',
        400,
        'ASSIGNMENT_NOT_PUBLISHED'
      );
    }

    // Generate unique student token
    const rawToken = TaskRun.generateToken();
    const tokenHash = TaskRun.hashToken(rawToken);

    const taskRun = new TaskRun({
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim().toLowerCase(),
      assignmentId: assignment._id,
      status: 'assigned',
      assignedAt: new Date(),
      taskAccessTokenHash: tokenHash,
      emailDeliveryStatus: 'pending'
    });

    await taskRun.save();

    // Send assignment email
    const emailResult = await emailService.sendAssignmentEmail({
      taskRun,
      assignment,
      rawToken
    });

    return {
      taskRunId: taskRun._id,
      status: taskRun.status,
      studentName: taskRun.studentName,
      studentEmail: taskRun.studentEmail,
      assignedAt: taskRun.assignedAt,
      emailSent: emailResult.success,
      // Provide rawToken in the response during development/admin assign so test flows or manual tests can proceed without email inbox
      rawToken
    };
  }

  async getStudentTask(taskRunId) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid task ID', 400, 'INVALID_ID');
    }

    const taskRun = await TaskRun.findById(taskRunId);
    if (!taskRun) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    const assignment = await Assignment.findById(taskRun.assignmentId);
    if (!assignment) {
      throw new AppError('Associated assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // Explicitly exclude answerKey and return only student-safe properties
    return {
      taskId: taskRun._id,
      status: taskRun.status,
      studentName: taskRun.studentName,
      studentEmail: taskRun.studentEmail,
      assignedAt: taskRun.assignedAt,
      briefingCompletedAt: taskRun.briefingCompletedAt,
      submittedAt: taskRun.submittedAt,
      reviewedAt: taskRun.reviewedAt,
      assignment: {
        id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        scenarioText: assignment.scenarioText,
        requirements: assignment.requirements,
        expectedOutcome: assignment.expectedOutcome,
        rubric: (assignment.rubric || []).map((r) => ({
          name: r.name,
          description: r.description,
          weight: r.weight
        }))
      }
    };
  }

  async completeBriefing(taskRunId) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid task ID', 400, 'INVALID_ID');
    }

    const taskRun = await TaskRun.findById(taskRunId);
    if (!taskRun) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Idempotent if already briefing_completed
    if (taskRun.status === 'briefing_completed') {
      return {
        taskId: taskRun._id,
        status: taskRun.status,
        briefingCompletedAt: taskRun.briefingCompletedAt
      };
    }

    if (taskRun.status !== 'assigned') {
      throw new AppError(
        `Cannot complete briefing when task is in "${taskRun.status}" state`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    taskRun.transitionTo('briefing_completed');
    await taskRun.save();

    return {
      taskId: taskRun._id,
      status: taskRun.status,
      briefingCompletedAt: taskRun.briefingCompletedAt
    };
  }

  async processSubmission({ taskRunId, codeText, repositoryUrl }) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid task ID', 400, 'INVALID_ID');
    }

    if (!codeText || typeof codeText !== 'string' || !codeText.trim()) {
      throw new AppError('Submitted codeText is required', 400, 'VALIDATION_ERROR');
    }

    const taskRun = await TaskRun.findById(taskRunId);
    if (!taskRun) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Idempotency check: If task is already reviewed, find existing review and return
    if (taskRun.status === 'reviewed') {
      const existingReview = await Review.findOne({ taskRunId });
      if (existingReview) {
        console.log(`[WorkflowService] Task ${taskRunId} already reviewed. Returning saved review.`);
        return {
          submissionId: existingReview.submissionId,
          review: existingReview,
          isExisting: true
        };
      }
    }

    // Check valid status
    const allowedSubmissionStates = ['assigned', 'briefing_completed', 'failed'];
    if (!allowedSubmissionStates.includes(taskRun.status)) {
      throw new AppError(
        `Task cannot be submitted when in "${taskRun.status}" status.`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // Check if assignment exists
    const assignment = await Assignment.findById(taskRun.assignmentId).select('+answerKey');
    if (!assignment) {
      throw new AppError('Associated assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // 1. Create and persist Submission record
    const submission = new Submission({
      taskRunId: taskRun._id,
      assignmentId: assignment._id,
      studentEmail: taskRun.studentEmail,
      codeText: codeText.trim(),
      repositoryUrl: repositoryUrl ? repositoryUrl.trim() : null,
      submittedAt: new Date(),
      status: 'received'
    });
    await submission.save();

    // 2. Transition TaskRun to reviewing
    taskRun.status = 'reviewing';
    taskRun.submittedAt = submission.submittedAt;
    await taskRun.save();

    submission.status = 'reviewing';
    await submission.save();

    let evaluationResult;
    try {
      // 3. AI Evaluation via Gemini
      evaluationResult = await geminiService.evaluateSubmission({
        assignment,
        submission
      });
    } catch (evalErr) {
      console.error(`[WorkflowService] AI Evaluation failed for submission ${submission._id}: ${evalErr.message}`);
      submission.status = 'failed';
      submission.errorInfo = evalErr.message;
      await submission.save();

      taskRun.status = 'failed';
      await taskRun.save();

      throw evalErr;
    }

    // 4. Persist Review with unique constraint
    let review;
    try {
      review = new Review({
        submissionId: submission._id,
        taskRunId: taskRun._id,
        score: evaluationResult.score,
        verdict: evaluationResult.verdict,
        summary: evaluationResult.summary,
        criterionScores: evaluationResult.criterionScores,
        strengths: evaluationResult.strengths,
        issues: evaluationResult.issues,
        nextSteps: evaluationResult.nextSteps,
        reviewMode: 'gemini-assisted'
      });
      await review.save();
    } catch (saveErr) {
      // If unique index collision, return existing review
      if (saveErr.code === 11000) {
        review = await Review.findOne({ submissionId: submission._id });
      } else {
        throw saveErr;
      }
    }

    // 5. Update submission and TaskRun to reviewed
    submission.status = 'reviewed';
    await submission.save();

    taskRun.status = 'reviewed';
    taskRun.reviewedAt = new Date();
    await taskRun.save();

    // 6. Send review email to student
    try {
      const emailResult = await emailService.sendReviewEmail({
        taskRun,
        assignment,
        submission,
        review
      });
      if (emailResult.success) {
        taskRun.reviewEmailSentAt = new Date();
        await taskRun.save();
      }
    } catch (emailErr) {
      console.error(`[WorkflowService] Review email failed to send: ${emailErr.message}`);
      // Do not abort review success on email error
    }

    // 7. Check if next assignment is configured
    let nextTaskInfo = null;
    if (assignment.nextAssignmentId) {
      try {
        const nextAssignment = await Assignment.findById(assignment.nextAssignmentId);
        if (nextAssignment && nextAssignment.status === 'published') {
          // Create next task run
          const rawNextToken = TaskRun.generateToken();
          const nextTaskRun = new TaskRun({
            studentName: taskRun.studentName,
            studentEmail: taskRun.studentEmail,
            assignmentId: nextAssignment._id,
            status: 'assigned',
            assignedAt: new Date(),
            taskAccessTokenHash: TaskRun.hashToken(rawNextToken),
            emailDeliveryStatus: 'pending'
          });
          await nextTaskRun.save();

          await emailService.sendNextAssignmentEmail({
            taskRun: nextTaskRun,
            assignment: nextAssignment,
            rawToken: rawNextToken
          });

          nextTaskInfo = {
            nextTaskRunId: nextTaskRun._id,
            nextAssignmentId: nextAssignment._id,
            nextAssignmentTitle: nextAssignment.title
          };
        } else {
          console.warn(`[WorkflowService] Next assignment ${assignment.nextAssignmentId} is not published or not found. Skipping.`);
        }
      } catch (nextErr) {
        console.error(`[WorkflowService] Failed to trigger next assignment: ${nextErr.message}`);
      }
    }

    return {
      submissionId: submission._id,
      taskRunId: taskRun._id,
      review,
      nextAssignment: nextTaskInfo
    };
  }

  async getStudentReview(taskRunId) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid task ID', 400, 'INVALID_ID');
    }

    const review = await Review.findOne({ taskRunId }).sort({ createdAt: -1 });
    if (!review) {
      throw new AppError('Review not found for this task', 404, 'REVIEW_NOT_FOUND');
    }

    return review;
  }

  async retryEmailDelivery(submissionId) {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw new AppError('Invalid submission ID', 400, 'INVALID_ID');
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    const review = await Review.findOne({ submissionId: submission._id });
    if (!review) {
      throw new AppError('Review not found for this submission', 404, 'REVIEW_NOT_FOUND');
    }

    const taskRun = await TaskRun.findById(submission.taskRunId);
    if (!taskRun) {
      throw new AppError('TaskRun not found', 404, 'TASK_NOT_FOUND');
    }

    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) {
      throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    const result = await emailService.sendReviewEmail({
      taskRun,
      assignment,
      submission,
      review
    });

    if (result.success) {
      taskRun.reviewEmailSentAt = new Date();
      await taskRun.save();
    }

    return result;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;

