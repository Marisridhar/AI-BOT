import mongoose from 'mongoose';

const moduleProgressSchema = new mongoose.Schema(
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['locked', 'available', 'in_progress', 'needs_revision', 'completed'],
      default: 'locked',
      index: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    completionCriteriaSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

moduleProgressSchema.index({ enrollmentId: 1, moduleId: 1 }, { unique: true });

export const ModuleProgress = mongoose.model('ModuleProgress', moduleProgressSchema);
export default ModuleProgress;

