import mongoose from 'mongoose';
import TaskRun from '../models/TaskRun.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import reviewService from './review.service.js';
import progressService from './progress.service.js';
import { AppError } from '../utils/AppError.js';

export class SubmissionService {
  async submitWork({ taskRunId, studentId, codeText, repositoryUrl }) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid taskRunId', 400, 'INVALID_ID');
    }

    if (!codeText || !codeText.trim()) {
      throw new AppError('Submitted codeText is required', 400, 'VALIDATION_ERROR');
    }

    const taskRun = await TaskRun.findById(taskRunId);
    if (!taskRun) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (studentId && taskRun.studentId && taskRun.studentId.toString() !== studentId.toString()) {
      throw new AppError('Access denied: You do not own this task', 403, 'FORBIDDEN');
    }

    const assignment = await Assignment.findById(taskRun.assignmentId).select('+answerKey');
    if (!assignment) {
      throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    // Check course assignment lock/accessibility
    if (taskRun.enrollmentId) {
      const isEligible = await progressService.canAccessAssignment(taskRun.enrollmentId, assignment._id);
      if (!isEligible) {
        throw new AppError(
          'Assignment is locked. Please complete all prerequisite lessons and understanding checks first.',
          403,
          'ASSIGNMENT_LOCKED'
        );
      }
    }

    // Check attempt limit
    const previousAttempts = await Submission.countDocuments({ taskRunId });
    const maxAttempts = assignment.maxAttempts || 3;
    if (previousAttempts >= maxAttempts) {
      throw new AppError(
        `Maximum submission attempts (${maxAttempts}) exceeded for this assignment`,
        400,
        'ATTEMPT_LIMIT_EXCEEDED'
      );
    }

    // Check deadline
    let isLate = false;
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      isLate = true;
    }

    // Create submission record
    const attemptNumber = previousAttempts + 1;
    const submission = new Submission({
      taskRunId: taskRun._id,
      assignmentId: assignment._id,
      enrollmentId: taskRun.enrollmentId || null,
      studentId: taskRun.studentId || null,
      studentEmail: taskRun.studentEmail,
      attemptNumber,
      codeText: codeText.trim(),
      repositoryUrl: repositoryUrl ? repositoryUrl.trim() : null,
      isLate,
      submittedAt: new Date(),
      status: 'received'
    });

    await submission.save();

    taskRun.status = 'reviewing';
    taskRun.attemptCount = attemptNumber;
    taskRun.submittedAt = submission.submittedAt;
    await taskRun.save();

    // Perform AI review
    const review = await reviewService.evaluateSubmissionAndSave(submission, assignment, taskRun);

    return {
      submission,
      review
    };
  }

  async listSubmissionsForTask(taskRunId, studentId = null) {
    if (!mongoose.Types.ObjectId.isValid(taskRunId)) {
      throw new AppError('Invalid taskRunId', 400, 'INVALID_ID');
    }

    const taskRun = await TaskRun.findById(taskRunId);
    if (!taskRun) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (studentId && taskRun.studentId && taskRun.studentId.toString() !== studentId.toString()) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return Submission.find({ taskRunId }).sort({ attemptNumber: -1 });
  }
}

export const submissionService = new SubmissionService();
export default submissionService;

