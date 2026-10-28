import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: [true, 'Message content is required']
    },
    contextMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;

