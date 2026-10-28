import mongoose from 'mongoose';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import { AppError } from '../utils/AppError.js';

export class LessonService {
  async createLesson(moduleId, data) {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw new AppError('Invalid module ID', 400, 'INVALID_ID');
    }

    const module = await Module.findById(moduleId);
    if (!module) {
      throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
    }

    const {
      title,
      description,
      learningObjectives,
      contentBlocks,
      resources,
      estimatedMinutes,
      required,
      understandingCheckConfig
    } = data;

    if (!title || !title.trim()) {
      throw new AppError('Lesson title is required', 400, 'VALIDATION_ERROR');
    }

    const lastLesson = await Lesson.findOne({ moduleId }).sort({ order: -1 });
    const order = data.order !== undefined ? Number(data.order) : (lastLesson ? lastLesson.order + 1 : 1);

    const lesson = new Lesson({
      courseId: module.courseId,
      moduleId,
      title: title.trim(),
      description: description ? description.trim() : '',
      order,
      learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
      contentBlocks: Array.isArray(contentBlocks) ? contentBlocks : [],
      resources: Array.isArray(resources) ? resources : [],
      estimatedMinutes: estimatedMinutes || 15,
      required: required !== undefined ? Boolean(required) : true,
      understandingCheckConfig: Array.isArray(understandingCheckConfig) ? understandingCheckConfig : []
    });

    await lesson.save();
    return lesson;
  }

  async listLessons(moduleId) {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw new AppError('Invalid module ID', 400, 'INVALID_ID');
    }
    return Lesson.find({ moduleId }).sort({ order: 1 });
  }

  async getLessonById(lessonId) {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw new AppError('Invalid lesson ID', 400, 'INVALID_ID');
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }
    return lesson;
  }

  async updateLesson(lessonId, updates) {
    const lesson = await this.getLessonById(lessonId);

    const allowed = [
      'title',
      'description',
      'order',
      'learningObjectives',
      'contentBlocks',
      'resources',
      'estimatedMinutes',
      'required',
      'understandingCheckConfig'
    ];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        lesson[key] = updates[key];
      }
    }

    await lesson.save();
    return lesson;
  }

  async deleteLesson(lessonId) {
    const lesson = await this.getLessonById(lessonId);
    await Lesson.deleteOne({ _id: lesson._id });
    return { message: 'Lesson deleted successfully' };
  }

  async reorderLessons(moduleId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new AppError('orderedIds array is required', 400, 'VALIDATION_ERROR');
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, moduleId },
        update: { $set: { order: index + 1 } }
      }
    }));

    await Lesson.bulkWrite(bulkOps);
    return this.listLessons(moduleId);
  }
}

export const lessonService = new LessonService();
export default lessonService;

