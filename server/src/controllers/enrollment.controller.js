import enrollmentService from '../services/enrollment.service.js';
import progressService from '../services/progress.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inviteStudent = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { email, name } = req.body;
  const result = await enrollmentService.inviteStudent({ courseId, email, name });
  res.status(201).json({
    success: true,
    data: result
  });
});

export const listEnrollments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const enrollments = await enrollmentService.listEnrollments(courseId);
  res.status(200).json({
    success: true,
    data: enrollments
  });
});

export const getEnrollmentProgress = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const outline = await progressService.getEnrollmentOutline(enrollmentId, null);
  res.status(200).json({
    success: true,
    data: outline
  });
});

export const revokeEnrollment = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const enrollment = await enrollmentService.revokeEnrollment(enrollmentId);
  res.status(200).json({
    success: true,
    data: enrollment
  });
});

