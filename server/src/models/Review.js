import mongoose from 'mongoose';

const criterionScoreSchema = new mongoose.Schema(
  {
    criterion: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1
    },
    feedback: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    criterion: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    evidence: {
      type: String,
      required: true,
      trim: true
    },
    suggestion: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true
    },
    taskRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRun',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    verdict: {
      type: String,
      required: true,
      enum: ['pass', 'revise', 'fail'],
      trim: true
    },
    decision: {
      type: String,
      enum: ['approved', 'needs_revision'],
      default: 'needs_revision',
      index: true
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    criterionScores: {
      type: [criterionScoreSchema],
      default: []
    },
    rubricBreakdown: {
      type: [criterionScoreSchema],
      default: []
    },
    strengths: {
      type: [String],
      default: []
    },
    issues: {
      type: [issueSchema],
      default: []
    },
    improvementSuggestions: {
      type: [String],
      default: []
    },
    nextSteps: {
      type: [String],
      default: []
    },
    overallFeedback: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    },
    reviewVersion: {
      type: Number,
      default: 1
    },
    reviewMode: {
      type: String,
      default: 'gemini-assisted'
    }
  },
  {
    timestamps: true
  }
);

// Auto-populate rubricBreakdown and decision if not set explicitly
reviewSchema.pre('save', function () {
  if ((!this.rubricBreakdown || this.rubricBreakdown.length === 0) && this.criterionScores) {
    this.rubricBreakdown = this.criterionScores;
  }
  if (!this.decision) {
    this.decision = (this.score >= 70 && this.verdict === 'pass') ? 'approved' : 'needs_revision';
  }
});

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
