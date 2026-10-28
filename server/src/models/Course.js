import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Course slug is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    learningObjectives: {
      type: [String],
      default: []
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    overallDeadline: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

export const Course = mongoose.model('Course', courseSchema);
export default Course;

