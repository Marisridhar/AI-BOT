import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    learningObjectives: {
      type: [String],
      default: []
    },
    prerequisiteModuleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
      }
    ],
    required: {
      type: Boolean,
      default: true
    },
    deadline: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    settings: {
      requireUnderstandingChecks: {
        type: Boolean,
        default: true
      },
      requireAssignmentApproval: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index on courseId and order
moduleSchema.index({ courseId: 1, order: 1 });

export const Module = mongoose.model('Module', moduleSchema);
export default Module;

