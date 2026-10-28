import mongoose from 'mongoose';
import Course from '../models/Course.js';
import coursePreparationService from './course-preparation.service.js';
import { AppError } from '../utils/AppError.js';

export class CourseService {
  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  async createCourse(data, adminId) {
    const { title, description, learningObjectives, difficulty, overallDeadline, timezone } = data;
    if (!title || !title.trim()) {
      throw new AppError('Course title is required', 400, 'VALIDATION_ERROR');
    }

    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;
    while (await Course.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const course = new Course({
      title: title.trim(),
      slug,
      description: description ? description.trim() : '',
      learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
      difficulty: difficulty || 'beginner',
      overallDeadline: overallDeadline ? new Date(overallDeadline) : null,
      timezone: timezone || 'UTC',
      createdBy: adminId || null,
      status: 'draft',
      version: 1
    });

    await course.save();
    return course;
  }

  async listCourses(filter = {}) {
    return Course.find(filter).sort({ createdAt: -1 });
  }

  async getCourseById(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new AppError('Invalid course ID', 400, 'INVALID_ID');
    }
    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    return course;
  }

  async updateCourse(courseId, updates) {
    const course = await this.getCourseById(courseId);

    // If published, edits increment version or must be carefully controlled
    if (course.status === 'published' && updates.title && updates.title !== course.title) {
      course.version += 1;
    }

    const allowedFields = ['title', 'description', 'learningObjectives', 'difficulty', 'overallDeadline', 'timezone'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        course[field] = updates[field];
      }
    }

    await course.save();
    return course;
  }

  async publishCourse(courseId) {
    const course = await this.getCourseById(courseId);
    if (course.status === 'published') {
      return course;
    }

    // Run deep course preparation and structure validation
    await coursePreparationService.validateCourseForPublication(courseId);

    course.status = 'published';
    course.publishedAt = new Date();
    await course.save();
    return course;
  }

  async archiveCourse(courseId) {
    const course = await this.getCourseById(courseId);
    course.status = 'archived';
    await course.save();
    return course;
  }
}

export const courseService = new CourseService();
export default courseService;

