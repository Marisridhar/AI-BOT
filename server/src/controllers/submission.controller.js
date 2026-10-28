import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSubmissionById = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new AppError('Invalid submission ID', 400, 'INVALID_ID');
  }

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: submission
  });
});

