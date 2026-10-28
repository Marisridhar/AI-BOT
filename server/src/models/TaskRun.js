import mongoose from 'mongoose';
import crypto from 'crypto';

export const TASK_STATUSES = [
  'assigned',
  'briefing_completed',
  'submitted',
  'reviewing',
  'reviewed',
  'needs_revision',
  'approved',
  'failed',
  'needs_manual_review'
];

export const VALID_TRANSITIONS = {
  assigned: ['briefing_completed', 'submitted', 'failed'],
  briefing_completed: ['submitted', 'failed'],
  submitted: ['reviewing', 'failed'],
  reviewing: ['reviewed', 'needs_revision', 'approved', 'failed', 'needs_manual_review'],
  reviewed: ['needs_revision', 'approved', 'submitted'],
  needs_revision: ['submitted', 'reviewing'],
  approved: [],
  failed: ['reviewing', 'submitted'],
  needs_manual_review: ['approved', 'needs_revision', 'reviewing']
};

const taskRunSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    studentEmail: {
      type: String,
      required: [true, 'Student email is required'],
      lowercase: true,
      trim: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      default: null,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'assigned',
      index: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dueAt: {
      type: Date,
      default: null
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    latestSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null
    },
    briefingCompletedAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    reviewEmailSentAt: {
      type: Date,
      default: null
    },
    taskAccessTokenHash: {
      type: String,
      required: true,
      index: true,
      select: false // Excluded by default
    },
    emailDeliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    emailFailureMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    assignmentVersionSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.taskAccessTokenHash;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.taskAccessTokenHash;
        return ret;
      }
    }
  }
);

taskRunSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

taskRunSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
};

taskRunSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = VALID_TRANSITIONS[this.status] || [];
  return allowed.includes(newStatus);
};

taskRunSchema.methods.transitionTo = function (newStatus) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Invalid status transition from "${this.status}" to "${newStatus}"`);
  }
  this.status = newStatus;
  if (newStatus === 'briefing_completed') {
    this.briefingCompletedAt = new Date();
  } else if (newStatus === 'submitted') {
    this.submittedAt = new Date();
  } else if (newStatus === 'reviewed') {
    this.reviewedAt = new Date();
  } else if (newStatus === 'approved') {
    this.completedAt = new Date();
  }
  return this;
};

export const TaskRun = mongoose.model('TaskRun', taskRunSchema);
export default TaskRun;
