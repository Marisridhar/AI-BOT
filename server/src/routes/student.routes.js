import { Router } from 'express';
import {
  getStudentDashboard,
  getCourseDetails,
  getEnrollmentDetails,
  getEnrollmentOutline
} from '../controllers/dashboard.controller.js';
import {
  getLessonContent,
  startLesson,
  submitUnderstandingCheck,
  completeLesson,
  getLessonProgress
} from '../controllers/student-lesson.controller.js';
import {
  getAssignmentInstance,
  startAssignmentTask,
  submitWork,
  listAttempts,
  getReview
} from '../controllers/student-assignment.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

// Student access requires authentication
router.use(authenticate);

// Dashboard & outline
router.get('/dashboard', getStudentDashboard);
router.get('/courses/:courseId', getCourseDetails);
router.get('/enrollments/:enrollmentId', getEnrollmentDetails);
router.get('/enrollments/:enrollmentId/outline', getEnrollmentOutline);
router.get('/enrollments/:enrollmentId/progress', getEnrollmentOutline);

// Lessons & understanding checks
router.get('/lessons/:lessonId', getLessonContent);
router.post('/lessons/:lessonId/start', startLesson);
router.post('/lessons/:lessonId/understanding-check', submitUnderstandingCheck);
router.post('/lessons/:lessonId/complete', completeLesson);
router.get('/lessons/:lessonId/progress', getLessonProgress);

// Assignments & submissions
router.post('/assignments/:assignmentId/start', startAssignmentTask);
router.get('/assignments/:taskRunId', getAssignmentInstance);
router.post('/assignments/:taskRunId/submissions', submitWork);
router.get('/assignments/:taskRunId/submissions', listAttempts);
router.get('/submissions/:submissionId/review', getReview);

export default router;

