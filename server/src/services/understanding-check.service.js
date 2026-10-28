import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import geminiService from './gemini.service.js';
import { AppError } from '../utils/AppError.js';

export class UnderstandingCheckService {
  async evaluateCheck({ enrollmentId, studentId, lessonId, checkId, answer }) {
    if (!checkId || answer === undefined) {
      throw new AppError('checkId and answer are required', 400, 'VALIDATION_ERROR');
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const question = (lesson.understandingCheckConfig || []).find((q) => q.id === checkId);
    if (!question) {
      throw new AppError('Question not found in this lesson', 404, 'CHECK_NOT_FOUND');
    }

    let progress = await LessonProgress.findOne({ enrollmentId, lessonId });
    if (!progress) {
      progress = new LessonProgress({
        enrollmentId,
        studentId,
        moduleId: lesson.moduleId,
        lessonId,
        status: 'in_progress',
        understandingChecks: []
      });
    }

    let passed = false;
    let feedback = '';

    const cleanAnswer = String(answer).trim();

    if (question.type === 'multiple_choice') {
      const expected = String(question.expectedAnswer || '').trim().toLowerCase();
      passed = cleanAnswer.toLowerCase() === expected;
      feedback = passed
        ? 'Correct answer!'
        : `Incorrect. Try reviewing the lesson material and try again.`;
    } else if (question.type === 'short_answer') {
      const expected = String(question.expectedAnswer || '').trim().toLowerCase();
      if (cleanAnswer.toLowerCase() === expected) {
        passed = true;
        feedback = 'Spot on! Correct answer.';
      } else {
        // AI-assisted check if expectedAnswer is not an exact match
        try {
          const evalResult = await geminiService.evaluateShortAnswer({
            prompt: question.prompt,
            expectedCriteria: question.passingCriteria || question.expectedAnswer,
            studentAnswer: cleanAnswer
          });
          passed = evalResult.passed;
          feedback = evalResult.feedback;
        } catch {
          passed = cleanAnswer.length > 5;
          feedback = passed ? 'Answer recorded.' : 'Please provide a more complete answer.';
        }
      }
    } else {
      passed = cleanAnswer.length > 0;
      feedback = 'Practice response recorded.';
    }

    // Record check in lesson progress
    const existingIndex = progress.understandingChecks.findIndex((c) => c.checkId === checkId);
    const checkRecord = {
      checkId,
      answer: cleanAnswer,
      passed,
      feedback,
      attemptedAt: new Date()
    };

    if (existingIndex >= 0) {
      progress.understandingChecks[existingIndex] = checkRecord;
    } else {
      progress.understandingChecks.push(checkRecord);
    }

    progress.attemptCount += 1;
    progress.lastAccessedAt = new Date();
    await progress.save();

    return {
      checkId,
      passed,
      feedback,
      allChecksPassed: (lesson.understandingCheckConfig || []).every((chk) => {
        const c = progress.understandingChecks.find((x) => x.checkId === chk.id);
        return c && c.passed;
      })
    };
  }
}

export const understandingCheckService = new UnderstandingCheckService();
export default understandingCheckService;

