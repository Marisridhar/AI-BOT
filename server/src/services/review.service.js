import Review from '../models/Review.js';
import TaskRun from '../models/TaskRun.js';
import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';
import geminiService from './gemini.service.js';
import emailService from './email.service.js';
import progressService from './progress.service.js';

export class ReviewService {
  async evaluateSubmissionAndSave(submission, assignment, taskRun) {
    let fullAssignment = assignment;
    if (!fullAssignment.answerKey) {
      fullAssignment = await Assignment.findById(assignment._id).select('+answerKey');
    }

    const evaluationResult = await geminiService.evaluateSubmission({
      assignment: fullAssignment,
      submission
    });

    const decision = (evaluationResult.score >= 70 && evaluationResult.verdict === 'pass')
      ? 'approved'
      : 'needs_revision';

    const review = new Review({
      submissionId: submission._id,
      taskRunId: taskRun._id,
      studentId: taskRun.studentId || null,
      score: evaluationResult.score,
      verdict: evaluationResult.verdict,
      decision,
      summary: evaluationResult.summary,
      criterionScores: evaluationResult.criterionScores,
      rubricBreakdown: evaluationResult.criterionScores,
      strengths: evaluationResult.strengths,
      issues: evaluationResult.issues,
      improvementSuggestions: (evaluationResult.issues || []).map((i) => i.suggestion),
      nextSteps: evaluationResult.nextSteps,
      overallFeedback: evaluationResult.summary,
      reviewMode: 'gemini-assisted'
    });

    await review.save();

    // Update submission
    submission.status = 'reviewed';
    await submission.save();

    // Update task run
    taskRun.status = decision === 'approved' ? 'approved' : 'needs_revision';
    taskRun.reviewedAt = new Date();
    taskRun.latestSubmissionId = submission._id;
    if (decision === 'approved') {
      taskRun.completedAt = new Date();
    }
    await taskRun.save();

    // Send review email
    try {
      await emailService.sendReviewEmail({
        taskRun,
        assignment: fullAssignment,
        submission,
        review
      });
      taskRun.reviewEmailSentAt = new Date();
      await taskRun.save();
    } catch (emailErr) {
      console.warn(`[ReviewService] Email dispatch non-fatal failure: ${emailErr.message}`);
    }

    // Trigger module progression recalculation if this is part of a course enrollment
    if (decision === 'approved' && taskRun.enrollmentId && taskRun.moduleId) {
      await progressService.recalculateModuleProgress(taskRun.enrollmentId, taskRun.moduleId);
    }

    return review;
  }

  async getReviewBySubmissionId(submissionId) {
    return Review.findOne({ submissionId });
  }

  async getReviewByTaskId(taskRunId) {
    return Review.findOne({ taskRunId }).sort({ createdAt: -1 });
  }
}

export const reviewService = new ReviewService();
export default reviewService;

