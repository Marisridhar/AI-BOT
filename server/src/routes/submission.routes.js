import { Router } from 'express';
import { getSubmissionById } from '../controllers/submission.controller.js';
import { getReviewBySubmissionId, retryReviewEmail } from '../controllers/review.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = Router();

// Protected by admin authentication
router.use(adminAuth);

router.get('/:submissionId', getSubmissionById);
router.get('/:submissionId/review', getReviewBySubmissionId);
router.post('/:submissionId/retry-email', retryReviewEmail);

export default router;

