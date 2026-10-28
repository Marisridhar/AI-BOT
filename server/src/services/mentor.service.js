import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import courseContentService from './course-content.service.js';
import progressService from './progress.service.js';
import geminiService from './gemini.service.js';
import { AppError } from '../utils/AppError.js';

export class MentorService {
  async startConversation({ enrollmentId, studentId, courseId, moduleId, lessonId, title }) {
    if (!studentId) {
      throw new AppError('studentId is required', 400, 'VALIDATION_ERROR');
    }

    // Validate enrollment only when enrollmentId is provided
    if (enrollmentId) {
      const enrollment = await CourseEnrollment.findOne({ _id: enrollmentId, studentId });
      if (!enrollment) {
        throw new AppError('Enrolled course not found for student', 404, 'ENROLLMENT_NOT_FOUND');
      }
    }

    const conversation = new Conversation({
      enrollmentId: enrollmentId || null,
      studentId,
      courseId: courseId || null,
      moduleId: moduleId || null,
      lessonId: lessonId || null,
      title: title || 'Learning Conversation',
      lastMessageAt: new Date()
    });

    await conversation.save();
    return conversation;
  }

  async listConversations(studentId, enrollmentId = null) {
    const filter = { studentId };
    if (enrollmentId) filter.enrollmentId = enrollmentId;
    return Conversation.find(filter).sort({ lastMessageAt: -1 });
  }

  async getMessages(conversationId, studentId, { limit = 50, page = 1 } = {}) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const conversation = await Conversation.findOne({ _id: conversationId, studentId });
    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 404, 'CONVERSATION_NOT_FOUND');
    }

    const skip = (page - 1) * limit;
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    return {
      conversation,
      messages
    };
  }

  async sendMessage({ conversationId, studentId, content }) {
    if (!conversationId || !content || !content.trim()) {
      throw new AppError('Message content cannot be empty', 400, 'VALIDATION_ERROR');
    }

    const conversation = await Conversation.findOne({ _id: conversationId, studentId });
    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 404, 'CONVERSATION_NOT_FOUND');
    }

    // 1. Save student user message
    const userMessage = new ChatMessage({
      conversationId: conversation._id,
      studentId,
      role: 'user',
      content: content.trim()
    });
    await userMessage.save();

    // 2. Fetch course context (without answerKey)
    const courseContext = await courseContentService.getContextForLesson({
      lessonId: conversation.lessonId,
      moduleId: conversation.moduleId,
      courseId: conversation.courseId
    });

    // 3. Fetch student actual progress
    let studentProgress = {};
    try {
      studentProgress = await progressService.getEnrollmentOutline(conversation.enrollmentId, studentId);
    } catch {
      studentProgress = { status: 'in_progress' };
    }

    // 4. Fetch recent conversation history
    const recentMessages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(6);
    recentMessages.reverse();

    // 5. Generate reply from Gemini
    const { reply, suggestedAction } = await geminiService.generateMentorReply({
      courseContext,
      studentProgress,
      conversationHistory: recentMessages,
      studentMessage: content.trim()
    });

    // 6. Save assistant message
    const assistantMessage = new ChatMessage({
      conversationId: conversation._id,
      studentId,
      role: 'assistant',
      content: reply,
      contextMetadata: {
        suggestedAction,
        moduleId: conversation.moduleId,
        lessonId: conversation.lessonId
      }
    });
    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return {
      message: assistantMessage,
      suggestedAction
    };
  }
}

export const mentorService = new MentorService();
export default mentorService;

