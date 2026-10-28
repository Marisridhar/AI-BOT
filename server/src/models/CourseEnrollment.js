import mongoose from 'mongoose';

const courseEnrollmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'completed', 'revoked'],
      default: 'invited',
      index: true
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    enrolledAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    courseVersion: {
      type: Number,
      default: 1
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    invitationTokenHash: {
      type: String,
      select: false,
      default: null
    },
    invitationTokenExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.invitationTokenHash;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.invitationTokenHash;
        return ret;
      }
    }
  }
);

// Compound unique index: A student can only have one enrollment per course
courseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

export const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
export default CourseEnrollment;

