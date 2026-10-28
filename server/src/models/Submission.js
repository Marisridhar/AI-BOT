import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    taskRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRun',
      required: [true, 'TaskRun ID is required'],
      index: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required'],
      index: true
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
      default: null,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    studentEmail: {
      type: String,
      required: [true, 'Student email is required'],
      lowercase: true,
      trim: true
    },
    attemptNumber: {
      type: Number,
      default: 1
    },
    codeText: {
      type: String,
      required: [true, 'Submitted code text is required'],
      maxlength: [500000, 'Code text exceeds maximum allowed size of 500,000 characters']
    },
    repositoryUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          if (!val) return true;
          try {
            const url = new URL(val);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'repositoryUrl must be a valid HTTP or HTTPS URL'
      },
      default: null
    },
    attachmentMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isLate: {
      type: Boolean,
      default: false
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['received', 'reviewing', 'reviewed', 'failed'],
      default: 'received'
    },
    errorInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
