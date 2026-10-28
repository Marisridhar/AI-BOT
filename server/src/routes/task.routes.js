import { Router } from 'express';
import {
  getTaskDetails,
  markBriefingCompleted,
  submitTaskWork,
  getTaskReview
} from '../controllers/task.controller.js';
import taskAuth from '../middleware/taskAuth.js';

const router = Router();

// Student access requires valid Bearer token for the taskRunId
router.get('/:taskRunId', taskAuth, getTaskDetails);
router.post('/:taskRunId/briefing-complete', taskAuth, markBriefingCompleted);
router.post('/:taskRunId/submissions', taskAuth, submitTaskWork);
router.get('/:taskRunId/review', taskAuth, getTaskReview);

export default router;

