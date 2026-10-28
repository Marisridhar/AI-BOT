import mentorService from '../services/mentor.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const startConversation = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { enrollmentId, courseId, moduleId, lessonId, title } = req.body;
  const conversation = await mentorService.startConversation({
    enrollmentId,
    studentId,
    courseId,
    moduleId,
    lessonId,
    title
  });
  res.status(201).json({
    success: true,
    data: conversation
  });
});

export const listConversations = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const enrollmentId = req.query.enrollmentId || null;
  const conversations = await mentorService.listConversations(studentId, enrollmentId);
  res.status(200).json({
    success: true,
    data: conversations
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { conversationId } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '50', 10);

  const result = await mentorService.getMessages(conversationId, studentId, { page, limit });
  res.status(200).json({
    success: true,
    data: result
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { conversationId } = req.params;
  const { content } = req.body;

  const result = await mentorService.sendMessage({
    conversationId,
    studentId,
    content
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

