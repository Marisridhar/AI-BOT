import mongoose from 'mongoose';

const understandingCheckAttemptSchema = new mongoose.Schema(
  {
    checkId: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      default: ''
    },
    passed: {
      type: Boolean,
      default: false
    },
    feedback: {
      type: String,
      default: ''
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const lessonProgressSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
      index: true
    },
    understandingChecks: {
      type: [understandingCheckAttemptSchema],
      default: []
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: null
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

lessonProgressSchema.index({ enrollmentId: 1, lessonId: 1 }, { unique: true });

export const LessonProgress = mongoose.model('LessonProgress', lessonProgressSchema);
export default LessonProgress;

