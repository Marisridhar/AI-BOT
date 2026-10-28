import submissionService from '../services/submission.service.js';
import reviewService from '../services/review.service.js';
import workflowService from '../services/workflow.service.js';
import TaskRun from '../models/TaskRun.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getAssignmentInstance = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const studentId = req.user._id || req.user.id;

  const task = await TaskRun.findById(taskRunId);
  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  if (studentId && task.studentId && task.studentId.toString() !== studentId.toString()) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const details = await workflowService.getStudentTask(taskRunId);
  res.status(200).json({
    success: true,
    data: {
      ...details,
      taskRunId: task._id
    }
  });
});

export const startAssignmentTask = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { enrollmentId } = req.body;
  const studentId = req.user._id || req.user.id;

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  let task = await TaskRun.findOne({
    assignmentId: assignment._id,
    studentId
  });

  if (!task) {
    const rawToken = TaskRun.generateToken();
    task = new TaskRun({
      studentName: req.user.name || 'Student',
      studentEmail: req.user.email,
      studentId,
      assignmentId: assignment._id,
      enrollmentId: enrollmentId || null,
      courseId: assignment.courseId || null,
      moduleId: assignment.moduleId || null,
      status: 'assigned',
      taskAccessTokenHash: TaskRun.hashToken(rawToken)
    });
    await task.save();
  }

  const details = await workflowService.getStudentTask(task._id);
  res.status(200).json({
    success: true,
    data: {
      ...details,
      taskRunId: task._id
    }
  });
});

export const submitWork = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const studentId = req.user._id || req.user.id;
  const { codeText, repositoryUrl } = req.body;

  const result = await submissionService.submitWork({
    taskRunId,
    studentId,
    codeText,
    repositoryUrl
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

export const listAttempts = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const studentId = req.user._id || req.user.id;

  const submissions = await submissionService.listSubmissionsForTask(taskRunId, studentId);
  res.status(200).json({
    success: true,
    data: submissions
  });
});

export const getReview = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const review = await reviewService.getReviewBySubmissionId(submissionId);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: review
  });
});

