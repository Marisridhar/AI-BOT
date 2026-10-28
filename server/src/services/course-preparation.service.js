import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assignment from '../models/Assignment.js';
import { AppError } from '../utils/AppError.js';

export class CoursePreparationService {
  async validateCourseForPublication(courseId) {
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    if (modules.length === 0) {
      throw new AppError('Cannot publish course: course has no modules', 400, 'PUBLISH_VALIDATION_FAILED');
    }

    const moduleIds = new Set(modules.map((m) => m._id.toString()));

    for (const mod of modules) {
      // Validate prerequisite IDs belong to this course
      if (Array.isArray(mod.prerequisiteModuleIds)) {
        for (const prereqId of mod.prerequisiteModuleIds) {
          if (!moduleIds.has(prereqId.toString())) {
            throw new AppError(
              `Module "${mod.title}" has an invalid prerequisite outside this course`,
              400,
              'PUBLISH_VALIDATION_FAILED'
            );
          }
        }
      }

      // Check module content
      const lessons = await Lesson.find({ moduleId: mod._id });
      const assignments = await Assignment.find({ moduleId: mod._id }).select('+answerKey');

      if (lessons.length === 0 && assignments.length === 0) {
        throw new AppError(
          `Module "${mod.title}" must have at least one lesson or assignment before publishing`,
          400,
          'PUBLISH_VALIDATION_FAILED'
        );
      }

      // Validate each assignment under this module
      for (const ass of assignments) {
        if (!ass.answerKey) {
          throw new AppError(
            `Assignment "${ass.title}" is missing a reference answerKey`,
            400,
            'PUBLISH_VALIDATION_FAILED'
          );
        }
        if (!ass.rubric || ass.rubric.length === 0) {
          throw new AppError(
            `Assignment "${ass.title}" is missing a grading rubric`,
            400,
            'PUBLISH_VALIDATION_FAILED'
          );
        }
        const totalWeight = ass.rubric.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
        if (Math.abs(totalWeight - 100) > 0.001) {
          throw new AppError(
            `Assignment "${ass.title}" rubric weights must sum to 100 (current: ${totalWeight})`,
            400,
            'PUBLISH_VALIDATION_FAILED'
          );
        }
      }
    }

    return {
      valid: true,
      modulesCount: modules.length,
      message: 'Course structure and content verified successfully'
    };
  }
}

export const coursePreparationService = new CoursePreparationService();
export default coursePreparationService;

