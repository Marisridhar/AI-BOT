import { Router } from 'express';
import {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
  publishCourse,
  archiveCourse,
  prepareCourse
} from '../controllers/course.controller.js';
import {
  createModule,
  listModules,
  getModuleById,
  updateModule,
  deleteModule,
  reorderModules
} from '../controllers/module.controller.js';
import {
  createLesson,
  listLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  reorderLessons
} from '../controllers/lesson.controller.js';
import {
  inviteStudent,
  listEnrollments,
  getEnrollmentProgress,
  revokeEnrollment
} from '../controllers/enrollment.controller.js';
import {
  createAssignment,
  listAssignments,
  getAssignmentById,
  assignToStudent
} from '../controllers/assignment.controller.js';
import { getReviewBySubmissionId, retryReviewEmail } from '../controllers/review.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorizeRole from '../middleware/authorizeRole.js';

const router = Router();

// Protect all admin routes: authenticate and require admin role
router.use(authenticate);
router.use(authorizeRole('admin'));

// Courses
router.post('/courses', createCourse);
router.get('/courses', listCourses);
router.get('/courses/:courseId', getCourseById);
router.patch('/courses/:courseId', updateCourse);
router.post('/courses/:courseId/publish', publishCourse);
router.post('/courses/:courseId/archive', archiveCourse);
router.post('/courses/:courseId/prepare', prepareCourse);

// Modules
router.post('/courses/:courseId/modules', createModule);
router.get('/courses/:courseId/modules', listModules);
router.get('/modules/:moduleId', getModuleById);
router.patch('/modules/:moduleId', updateModule);
router.delete('/modules/:moduleId', deleteModule);
router.patch('/courses/:courseId/modules/reorder', reorderModules);

// Lessons
router.post('/modules/:moduleId/lessons', createLesson);
router.get('/modules/:moduleId/lessons', listLessons);
router.get('/lessons/:lessonId', getLessonById);
router.patch('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);
router.patch('/modules/:moduleId/lessons/reorder', reorderLessons);

// Enrollments
router.post('/courses/:courseId/enroll', inviteStudent);
router.get('/courses/:courseId/enrollments', listEnrollments);
router.get('/enrollments/:enrollmentId/progress', getEnrollmentProgress);
router.post('/enrollments/:enrollmentId/revoke', revokeEnrollment);

// Assignments & Reviews
router.post('/assignments', createAssignment);
router.get('/assignments', listAssignments);
router.get('/assignments/:assignmentId', getAssignmentById);
router.post('/assignments/:assignmentId/assign', assignToStudent);
router.get('/submissions/:submissionId/review', getReviewBySubmissionId);
router.post('/submissions/:submissionId/retry-email', retryReviewEmail);

export default router;

