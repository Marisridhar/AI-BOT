import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    taskRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRun',
      default: null,
      index: true
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
      index: true
    },
    emailType: {
      type: String,
      enum: ['assignment', 'review', 'next_assignment', 'invitation'],
      required: true
    },
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    lastError: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;

