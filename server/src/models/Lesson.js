import mongoose from 'mongoose';

const contentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['text', 'code', 'demonstration', 'practice'],
      default: 'text'
    },
    content: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['video', 'doc', 'link', 'pdf'],
      default: 'link'
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const understandingQuestionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    prompt: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'short_answer', 'code'],
      default: 'multiple_choice'
    },
    options: {
      type: [String],
      default: []
    },
    expectedAnswer: {
      type: String,
      default: ''
    },
    passingCriteria: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
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
    contentBlocks: {
      type: [contentBlockSchema],
      default: []
    },
    resources: {
      type: [resourceSchema],
      default: []
    },
    estimatedMinutes: {
      type: Number,
      default: 15
    },
    required: {
      type: Boolean,
      default: true
    },
    understandingCheckConfig: {
      type: [understandingQuestionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

lessonSchema.index({ moduleId: 1, order: 1 });

export const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;

