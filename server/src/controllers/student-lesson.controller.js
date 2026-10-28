import lessonService from '../services/lesson.service.js';
import progressService from '../services/progress.service.js';
import understandingCheckService from '../services/understanding-check.service.js';
import LessonProgress from '../models/LessonProgress.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getLessonContent = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const enrollmentId = req.query.enrollmentId;

  if (enrollmentId) {
    const isAccessible = await progressService.canAccessLesson(enrollmentId, lessonId);
    if (!isAccessible) {
      throw new AppError('Lesson is currently locked by prerequisite or module rules', 403, 'LESSON_LOCKED');
    }
  }

  const lesson = await lessonService.getLessonById(lessonId);
  res.status(200).json({
    success: true,
    data: lesson
  });
});

export const startLesson = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { lessonId } = req.params;
  const { enrollmentId } = req.body;

  if (!enrollmentId) {
    throw new AppError('enrollmentId is required', 400, 'VALIDATION_ERROR');
  }

  const isAccessible = await progressService.canAccessLesson(enrollmentId, lessonId);
  if (!isAccessible) {
    throw new AppError('Lesson is locked', 403, 'LESSON_LOCKED');
  }

  const lesson = await lessonService.getLessonById(lessonId);
  let progress = await LessonProgress.findOne({ enrollmentId, lessonId });
  if (!progress) {
    progress = new LessonProgress({
      enrollmentId,
      studentId,
      moduleId: lesson.moduleId,
      lessonId,
      status: 'in_progress',
      lastAccessedAt: new Date()
    });
  } else if (progress.status === 'not_started') {
    progress.status = 'in_progress';
    progress.lastAccessedAt = new Date();
  }
  await progress.save();

  res.status(200).json({
    success: true,
    data: progress
  });
});

export const submitUnderstandingCheck = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { lessonId } = req.params;
  const { enrollmentId, checkId, answer } = req.body;

  const result = await understandingCheckService.evaluateCheck({
    enrollmentId,
    studentId,
    lessonId,
    checkId,
    answer
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

export const completeLesson = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { lessonId } = req.params;
  const { enrollmentId } = req.body;

  const progress = await progressService.completeLesson({
    enrollmentId,
    studentId,
    lessonId
  });

  res.status(200).json({
    success: true,
    data: progress
  });
});

export const getLessonProgress = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const enrollmentId = req.query.enrollmentId;

  const progress = await LessonProgress.findOne({ enrollmentId, lessonId });
  res.status(200).json({
    success: true,
    data: progress || { status: 'not_started' }
  });
});

