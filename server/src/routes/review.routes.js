import { Router } from 'express';
import { getReviewBySubmissionId, retryReviewEmail } from '../controllers/review.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = Router();

router.use(adminAuth);

router.get('/submission/:submissionId', getReviewBySubmissionId);
router.post('/submission/:submissionId/retry-email', retryReviewEmail);

export default router;

