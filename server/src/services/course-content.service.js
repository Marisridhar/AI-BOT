import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import { AppError } from '../utils/AppError.js';

export class CourseContentService {
  async getContextForLesson({ lessonId, moduleId, courseId }) {
    let lesson = null;
    let module = null;
    let course = null;

    if (lessonId) {
      lesson = await Lesson.findById(lessonId);
    }

    const resolvedModuleId = moduleId || (lesson ? lesson.moduleId : null);
    if (resolvedModuleId) {
      module = await Module.findById(resolvedModuleId);
    }

    const resolvedCourseId = courseId || (module ? module.courseId : (lesson ? lesson.courseId : null));
    if (resolvedCourseId) {
      course = await Course.findById(resolvedCourseId);
    }

    if (!course) {
      throw new AppError('Course context not found', 404, 'COURSE_NOT_FOUND');
    }

    // Load module assignments WITHOUT private answer keys
    let assignmentsInfo = [];
    if (resolvedModuleId) {
      const assignments = await Assignment.find({ moduleId: resolvedModuleId });
      assignmentsInfo = assignments.map((a) => ({
        id: a._id,
        title: a.title,
        scenario: a.scenarioText,
        requirements: a.requirements,
        expectedOutcome: a.expectedOutcome
        // answerKey is NEVER included
      }));
    }

    return {
      course: {
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        learningObjectives: course.learningObjectives
      },
      module: module
        ? {
            id: module._id,
            title: module.title,
            description: module.description,
            order: module.order,
            learningObjectives: module.learningObjectives
          }
        : null,
      lesson: lesson
        ? {
            id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            learningObjectives: lesson.learningObjectives,
            contentBlocks: lesson.contentBlocks,
            resources: lesson.resources,
            understandingChecks: (lesson.understandingCheckConfig || []).map((c) => ({
              id: c.id,
              prompt: c.prompt,
              type: c.type,
              options: c.options
            }))
          }
        : null,
      assignments: assignmentsInfo
    };
  }
}

export const courseContentService = new CourseContentService();
export default courseContentService;

