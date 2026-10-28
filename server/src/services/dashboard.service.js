import CourseEnrollment from '../models/CourseEnrollment.js';
import ModuleProgress from '../models/ModuleProgress.js';
import LessonProgress from '../models/LessonProgress.js';
import Lesson from '../models/Lesson.js';
import TaskRun from '../models/TaskRun.js';
import Assignment from '../models/Assignment.js';
import Module from '../models/Module.js';

export class DashboardService {
  async getStudentDashboard(studentId) {
    const enrollments = await CourseEnrollment.find({
      studentId,
      status: { $in: ['active', 'completed'] }
    }).populate('courseId');

    const courseSummaries = [];

    for (const enrollment of enrollments) {
      if (!enrollment.courseId) continue;

      // Find current active module
      const currentModuleProgress = await ModuleProgress.findOne({
        enrollmentId: enrollment._id,
        status: { $in: ['in_progress', 'available'] }
      }).populate('moduleId');

      let currentLesson = null;
      let nextAction = 'continue_lesson';

      if (currentModuleProgress && currentModuleProgress.moduleId) {
        // Find next incomplete lesson
        const lessons = await Lesson.find({
          moduleId: currentModuleProgress.moduleId._id
        }).sort({ order: 1 });

        for (const lesson of lessons) {
          const lp = await LessonProgress.findOne({
            enrollmentId: enrollment._id,
            lessonId: lesson._id
          });
          if (!lp || lp.status !== 'completed') {
            currentLesson = {
              id: lesson._id,
              title: lesson.title,
              order: lesson.order,
              status: lp ? lp.status : 'not_started'
            };

            if (lesson.understandingCheckConfig && lesson.understandingCheckConfig.length > 0) {
              const allPassed = (lp?.understandingChecks || []).every((c) => c.passed);
              if (!allPassed) {
                nextAction = 'take_understanding_check';
              }
            }
            break;
          }
        }

        // If all lessons in module are complete, check assignments
        if (!currentLesson) {
          const assignments = await Assignment.find({
            moduleId: currentModuleProgress.moduleId._id
          });

          for (const ass of assignments) {
            const task = await TaskRun.findOne({
              enrollmentId: enrollment._id,
              assignmentId: ass._id
            });
            if (!task || task.status === 'assigned') {
              nextAction = 'open_assignment';
              break;
            } else if (task.status === 'needs_revision') {
              nextAction = 'revise_submission';
              break;
            }
          }
        }
      } else if (enrollment.status === 'completed') {
        nextAction = 'course_completed';
      }

      courseSummaries.push({
        enrollmentId: enrollment._id,
        course: {
          id: enrollment.courseId._id,
          title: enrollment.courseId.title,
          slug: enrollment.courseId.slug,
          difficulty: enrollment.courseId.difficulty,
          overallDeadline: enrollment.courseId.overallDeadline
        },
        progressPercentage: enrollment.overallProgress,
        status: enrollment.status,
        currentModule: currentModuleProgress?.moduleId
          ? {
              id: currentModuleProgress.moduleId._id,
              title: currentModuleProgress.moduleId.title,
              order: currentModuleProgress.moduleId.order,
              status: currentModuleProgress.status
            }
          : null,
        currentLesson,
        recommendedAction: nextAction
      });
    }

    return {
      totalEnrolledCourses: courseSummaries.length,
      courses: courseSummaries
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;

