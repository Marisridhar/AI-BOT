import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import workflowService from '../services/workflow.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createAssignment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    scenarioText,
    requirements,
    expectedOutcome,
    answerKey,
    rubric,
    nextAssignmentId,
    status
  } = req.body;

  if (!title || !scenarioText || !expectedOutcome || !answerKey) {
    throw new AppError(
      'Title, scenarioText, expectedOutcome, and answerKey are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!Array.isArray(requirements) || requirements.length === 0) {
    throw new AppError('Requirements must be a non-empty array', 400, 'VALIDATION_ERROR');
  }

  if (!Array.isArray(rubric) || rubric.length === 0) {
    throw new AppError('Rubric must be a non-empty array of criteria', 400, 'VALIDATION_ERROR');
  }

  const totalWeight = rubric.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new AppError(
      `Rubric weights must sum to exactly 100. Current sum: ${totalWeight}`,
      400,
      'INVALID_RUBRIC_WEIGHTS'
    );
  }

  if (nextAssignmentId) {
    if (!mongoose.Types.ObjectId.isValid(nextAssignmentId)) {
      throw new AppError('Invalid nextAssignmentId format', 400, 'INVALID_ID');
    }
    const nextAssignment = await Assignment.findById(nextAssignmentId);
    if (!nextAssignment) {
      throw new AppError('Configured nextAssignment does not exist', 400, 'NEXT_ASSIGNMENT_NOT_FOUND');
    }
  }

  const assignment = new Assignment({
    title: title.trim(),
    description: description ? description.trim() : '',
    scenarioText: scenarioText.trim(),
    requirements,
    expectedOutcome: expectedOutcome.trim(),
    answerKey: answerKey.trim(),
    rubric,
    nextAssignmentId: nextAssignmentId || null,
    status: status || 'draft'
  });

  await assignment.save();

  // toJSON automatically excludes answerKey
  res.status(201).json({
    success: true,
    data: assignment
  });
});

export const listAssignments = asyncHandler(async (req, res) => {
  // answerKey is excluded by default via schema select: false
  const assignments = await Assignment.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: assignments
  });
});

export const getAssignmentById = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError('Invalid assignment ID format', 400, 'INVALID_ID');
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: assignment
  });
});

export const assignToStudent = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { studentName, studentEmail } = req.body;

  if (!studentName || !studentEmail) {
    throw new AppError('studentName and studentEmail are required', 400, 'VALIDATION_ERROR');
  }

  const result = await workflowService.assignTaskToStudent({
    assignmentId,
    studentName,
    studentEmail
  });

  res.status(201).json({
    success: true,
    data: result
  });
});

