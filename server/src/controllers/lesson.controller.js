import lessonService from '../services/lesson.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createLesson = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const lesson = await lessonService.createLesson(moduleId, req.body);
  res.status(201).json({
    success: true,
    data: lesson
  });
});

export const listLessons = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const lessons = await lessonService.listLessons(moduleId);
  res.status(200).json({
    success: true,
    data: lessons
  });
});

export const getLessonById = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await lessonService.getLessonById(lessonId);
  res.status(200).json({
    success: true,
    data: lesson
  });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await lessonService.updateLesson(lessonId, req.body);
  res.status(200).json({
    success: true,
    data: lesson
  });
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const result = await lessonService.deleteLesson(lessonId);
  res.status(200).json({
    success: true,
    data: result
  });
});

export const reorderLessons = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const { orderedIds } = req.body;
  const lessons = await lessonService.reorderLessons(moduleId, orderedIds);
  res.status(200).json({
    success: true,
    data: lessons
  });
});

