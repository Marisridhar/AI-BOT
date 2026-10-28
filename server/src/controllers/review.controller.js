import mongoose from 'mongoose';
import Review from '../models/Review.js';
import workflowService from '../services/workflow.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getReviewBySubmissionId = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new AppError('Invalid submission ID', 400, 'INVALID_ID');
  }

  const review = await Review.findOne({ submissionId });
  if (!review) {
    throw new AppError('Review not found for this submission', 404, 'REVIEW_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: review
  });
});

export const retryReviewEmail = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const result = await workflowService.retryEmailDelivery(submissionId);

  res.status(200).json({
    success: result.success,
    data: {
      message: result.success ? 'Email delivered successfully' : 'Email delivery failed',
      details: result
    }
  });
});

