import { Router } from 'express';
import {
  createAssignment,
  listAssignments,
  getAssignmentById,
  assignToStudent
} from '../controllers/assignment.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = Router();

// All routes here are admin-protected
router.use(adminAuth);

router.post('/', createAssignment);
router.get('/', listAssignments);
router.get('/:assignmentId', getAssignmentById);
router.post('/:assignmentId/assign', assignToStudent);

export default router;

