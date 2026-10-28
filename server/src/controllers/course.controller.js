import courseService from '../services/course.service.js';
import coursePreparationService from '../services/course-preparation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createCourse = asyncHandler(async (req, res) => {
  const adminId = req.user?._id !== 'admin_master' ? req.user?._id : null;
  const course = await courseService.createCourse(req.body, adminId);
  res.status(201).json({
    success: true,
    data: course
  });
});

export const listCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const courses = await courseService.listCourses(filter);
  res.status(200).json({
    success: true,
    data: courses
  });
});

export const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.getCourseById(courseId);
  res.status(200).json({
    success: true,
    data: course
  });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.updateCourse(courseId, req.body);
  res.status(200).json({
    success: true,
    data: course
  });
});

export const publishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.publishCourse(courseId);
  res.status(200).json({
    success: true,
    data: course
  });
});

export const archiveCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.archiveCourse(courseId);
  res.status(200).json({
    success: true,
    data: course
  });
});

export const prepareCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const result = await coursePreparationService.validateCourseForPublication(courseId);
  res.status(200).json({
    success: true,
    data: result
  });
});

