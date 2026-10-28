import mongoose from 'mongoose';
import CourseEnrollment from '../models/CourseEnrollment.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assignment from '../models/Assignment.js';
import TaskRun from '../models/TaskRun.js';
import ModuleProgress from '../models/ModuleProgress.js';
import LessonProgress from '../models/LessonProgress.js';
import { AppError } from '../utils/AppError.js';

export class ProgressService {
  async initializeProgress(enrollmentId) {
    const enrollment = await CourseEnrollment.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
    }

    const modules = await Module.find({ courseId: enrollment.courseId }).sort({ order: 1 });
    const lessons = await Lesson.find({ courseId: enrollment.courseId }).sort({ order: 1 });

    // Step 1: Initialize ModuleProgress
    for (const mod of modules) {
      const hasPrereqs = Array.isArray(mod.prerequisiteModuleIds) && mod.prerequisiteModuleIds.length > 0;
      // First module with no prereqs is available; others are locked
      const initialStatus = (!hasPrereqs && mod.order === 1) ? 'available' : (hasPrereqs ? 'locked' : 'available');

      await ModuleProgress.findOneAndUpdate(
        { enrollmentId: enrollment._id, moduleId: mod._id },
        {
          $setOnInsert: {
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            status: initialStatus,
            startedAt: initialStatus === 'available' ? new Date() : null
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Step 2: Initialize LessonProgress
    for (const lesson of lessons) {
      await LessonProgress.findOneAndUpdate(
        { enrollmentId: enrollment._id, lessonId: lesson._id },
        {
          $setOnInsert: {
            studentId: enrollment.studentId,
            moduleId: lesson.moduleId,
            status: 'not_started'
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    await this.recalculateCourseProgress(enrollmentId);
  }

  async getEnrollmentOutline(enrollmentId, studentId) {
    const enrollment = await CourseEnrollment.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
    }

    if (studentId && enrollment.studentId.toString() !== studentId.toString()) {
      throw new AppError('Access denied: You do not own this enrollment', 403, 'FORBIDDEN');
    }

    const modules = await Module.find({ courseId: enrollment.courseId }).sort({ order: 1 });
    const moduleProgresses = await ModuleProgress.find({ enrollmentId });
    const progressMap = new Map(moduleProgresses.map((p) => [p.moduleId.toString(), p]));

    const outline = [];
    for (const mod of modules) {
      const modProgress = progressMap.get(mod._id.toString());
      const modStatus = modProgress ? modProgress.status : 'locked';

      const lessons = await Lesson.find({ moduleId: mod._id }).sort({ order: 1 });
      const assignments = await Assignment.find({ moduleId: mod._id }).sort({ createdAt: 1 });
      const lessonProgresses = await LessonProgress.find({
        enrollmentId,
        moduleId: mod._id
      });
      const lessonProgressMap = new Map(lessonProgresses.map((lp) => [lp.lessonId.toString(), lp]));

      const lessonItems = lessons.map((l) => {
        const lp = lessonProgressMap.get(l._id.toString());
        return {
          id: l._id,
          title: l.title,
          order: l.order,
          required: l.required,
          estimatedMinutes: l.estimatedMinutes,
          status: lp ? lp.status : 'not_started',
          completedAt: lp ? lp.completedAt : null
        };
      });

      const assignmentItems = assignments.map((a) => ({
        id: a._id,
        title: a.title,
        maxAttempts: a.maxAttempts,
        deadline: a.deadline
      }));

      outline.push({
        id: mod._id,
        title: mod.title,
        order: mod.order,
        status: modStatus,
        required: mod.required,
        lessons: lessonItems,
        assignments: assignmentItems
      });
    }

    return {
      enrollmentId: enrollment._id,
      courseId: enrollment.courseId,
      status: enrollment.status,
      overallProgress: enrollment.overallProgress,
      modules: outline
    };
  }

  async canAccessModule(enrollmentId, moduleId) {
    const progress = await ModuleProgress.findOne({ enrollmentId, moduleId });
    if (!progress) return false;
    return progress.status !== 'locked';
  }

  async canAccessLesson(enrollmentId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const moduleAccessible = await this.canAccessModule(enrollmentId, lesson.moduleId);
    if (!moduleAccessible) {
      return false;
    }

    // Check if prior required lessons in the same module are completed
    const priorRequiredLessons = await Lesson.find({
      moduleId: lesson.moduleId,
      order: { $lt: lesson.order },
      required: true
    });

    if (priorRequiredLessons.length > 0) {
      const priorIds = priorRequiredLessons.map((l) => l._id);
      const completedPriorCount = await LessonProgress.countDocuments({
        enrollmentId,
        lessonId: { $in: priorIds },
        status: 'completed'
      });
      if (completedPriorCount < priorRequiredLessons.length) {
        return false;
      }
    }

    return true;
  }

  async canAccessAssignment(enrollmentId, assignmentId) {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    if (!assignment.moduleId) {
      return true; // Standalone legacy assignment
    }

    const moduleAccessible = await this.canAccessModule(enrollmentId, assignment.moduleId);
    if (!moduleAccessible) {
      return false;
    }

    const module = await Module.findById(assignment.moduleId);
    if (module && module.settings?.requireUnderstandingChecks) {
      // All required lessons in the module must be completed
      const requiredLessons = await Lesson.find({
        moduleId: assignment.moduleId,
        required: true
      });
      const requiredIds = requiredLessons.map((l) => l._id);

      const completedCount = await LessonProgress.countDocuments({
        enrollmentId,
        lessonId: { $in: requiredIds },
        status: 'completed'
      });

      if (completedCount < requiredLessons.length) {
        return false;
      }
    }

    return true;
  }

  async completeLesson({ enrollmentId, studentId, lessonId }) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const isPermitted = await this.canAccessLesson(enrollmentId, lessonId);
    if (!isPermitted) {
      throw new AppError('Lesson is currently locked by module or prerequisite rules', 403, 'LESSON_LOCKED');
    }

    let progress = await LessonProgress.findOne({ enrollmentId, lessonId });
    if (!progress) {
      progress = new LessonProgress({
        enrollmentId,
        studentId,
        moduleId: lesson.moduleId,
        lessonId,
        status: 'in_progress'
      });
    }

    // Verify understanding checks if configured
    if (lesson.understandingCheckConfig && lesson.understandingCheckConfig.length > 0) {
      const passedCheckIds = new Set(
        (progress.understandingChecks || []).filter((c) => c.passed).map((c) => c.checkId)
      );
      const allPassed = lesson.understandingCheckConfig.every((chk) => passedCheckIds.has(chk.id));
      if (!allPassed) {
        throw new AppError(
          'Cannot complete lesson: required understanding checks must be answered correctly',
          400,
          'UNDERSTANDING_CHECKS_INCOMPLETE'
        );
      }
    }

    progress.status = 'completed';
    progress.completedAt = new Date();
    await progress.save();

    // Recalculate module progress
    await this.recalculateModuleProgress(enrollmentId, lesson.moduleId);

    return progress;
  }

  async recalculateModuleProgress(enrollmentId, moduleId) {
    const module = await Module.findById(moduleId);
    if (!module) return;

    const moduleProgress = await ModuleProgress.findOne({ enrollmentId, moduleId });
    if (!moduleProgress || moduleProgress.status === 'completed') {
      return;
    }

    // 1. Check all required lessons
    const requiredLessons = await Lesson.find({ moduleId, required: true });
    let lessonsSatisfied = true;
    if (requiredLessons.length > 0) {
      const requiredIds = requiredLessons.map((l) => l._id);
      const completedCount = await LessonProgress.countDocuments({
        enrollmentId,
        lessonId: { $in: requiredIds },
        status: 'completed'
      });
      lessonsSatisfied = completedCount >= requiredLessons.length;
    }

    // 2. Check all mandatory assignments
    const mandatoryAssignments = await Assignment.find({ moduleId });
    let assignmentsSatisfied = true;
    if (module.settings?.requireAssignmentApproval && mandatoryAssignments.length > 0) {
      for (const ass of mandatoryAssignments) {
        const approvedTask = await TaskRun.findOne({
          enrollmentId,
          assignmentId: ass._id,
          status: 'approved'
        });
        if (!approvedTask) {
          assignmentsSatisfied = false;
          break;
        }
      }
    }

    if (lessonsSatisfied && assignmentsSatisfied) {
      moduleProgress.status = 'completed';
      moduleProgress.completedAt = new Date();
      await moduleProgress.save();

      // Unlock dependent modules!
      await this.unlockEligibleDependentModules(enrollmentId, moduleId);
    } else if (moduleProgress.status === 'available') {
      moduleProgress.status = 'in_progress';
      await moduleProgress.save();
    }

    await this.recalculateCourseProgress(enrollmentId);
  }

  async unlockEligibleDependentModules(enrollmentId, completedModuleId) {
    // Find modules that have completedModuleId in their prerequisiteModuleIds
    const dependents = await Module.find({
      prerequisiteModuleIds: completedModuleId
    });

    for (const dep of dependents) {
      const depProgress = await ModuleProgress.findOne({ enrollmentId, moduleId: dep._id });
      if (depProgress && depProgress.status === 'locked') {
        // Check if all its prerequisites are completed
        const prereqProgresses = await ModuleProgress.find({
          enrollmentId,
          moduleId: { $in: dep.prerequisiteModuleIds }
        });
        const allPrereqsDone =
          prereqProgresses.length === dep.prerequisiteModuleIds.length &&
          prereqProgresses.every((p) => p.status === 'completed');

        if (allPrereqsDone) {
          depProgress.status = 'available';
          depProgress.startedAt = new Date();
          await depProgress.save();
          console.log(`[ProgressEngine] Unlocked module "${dep.title}" for enrollment ${enrollmentId}`);
        }
      }
    }
  }

  async recalculateCourseProgress(enrollmentId) {
    const enrollment = await CourseEnrollment.findById(enrollmentId);
    if (!enrollment) return;

    const totalModules = await Module.countDocuments({ courseId: enrollment.courseId, required: true });
    if (totalModules === 0) return;

    const completedModules = await ModuleProgress.countDocuments({
      enrollmentId,
      status: 'completed'
    });

    const percentage = Math.round((completedModules / totalModules) * 100);
    enrollment.overallProgress = Math.min(100, Math.max(0, percentage));

    if (enrollment.overallProgress >= 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
  }
}

export const progressService = new ProgressService();
export default progressService;
