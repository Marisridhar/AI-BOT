import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
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
      default: null,
      index: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: 'Learning Conversation'
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ studentId: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

