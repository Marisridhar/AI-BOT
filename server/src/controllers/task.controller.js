import workflowService from '../services/workflow.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getTaskDetails = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const taskDetails = await workflowService.getStudentTask(taskRunId);

  res.status(200).json({
    success: true,
    data: taskDetails
  });
});

export const markBriefingCompleted = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const result = await workflowService.completeBriefing(taskRunId);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const submitTaskWork = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const { codeText, repositoryUrl } = req.body;

  const result = await workflowService.processSubmission({
    taskRunId,
    codeText,
    repositoryUrl
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

export const getTaskReview = asyncHandler(async (req, res) => {
  const { taskRunId } = req.params;
  const review = await workflowService.getStudentReview(taskRunId);

  res.status(200).json({
    success: true,
    data: review
  });
});

