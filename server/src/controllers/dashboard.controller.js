import dashboardService from '../services/dashboard.service.js';
import progressService from '../services/progress.service.js';
import enrollmentService from '../services/enrollment.service.js';
import courseService from '../services/course.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStudentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const dashboard = await dashboardService.getStudentDashboard(studentId);
  res.status(200).json({
    success: true,
    data: dashboard
  });
});

export const getCourseDetails = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.getCourseById(courseId);
  res.status(200).json({
    success: true,
    data: course
  });
});

export const getEnrollmentDetails = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { enrollmentId } = req.params;
  const enrollment = await enrollmentService.getStudentEnrollment(enrollmentId, studentId);
  res.status(200).json({
    success: true,
    data: enrollment
  });
});

export const getEnrollmentOutline = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { enrollmentId } = req.params;
  const outline = await progressService.getEnrollmentOutline(enrollmentId, studentId);
  res.status(200).json({
    success: true,
    data: outline
  });
});

