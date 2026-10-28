import mongoose from 'mongoose';

const rubricCriterionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Criterion name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    weight: {
      type: Number,
      required: [true, 'Criterion weight is required'],
      min: [1, 'Criterion weight must be at least 1']
    }
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    scenarioText: {
      type: String,
      required: [true, 'Scenario text is required'],
      trim: true
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    requirements: {
      type: [String],
      validate: {
        validator: function (reqs) {
          return Array.isArray(reqs) && reqs.length > 0;
        },
        message: 'At least one requirement must be provided'
      }
    },
    learningObjectives: {
      type: [String],
      default: []
    },
    expectedOutcome: {
      type: String,
      required: [true, 'Expected outcome is required'],
      trim: true
    },
    submissionInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    deadline: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    acceptanceCriteria: {
      type: [String],
      default: []
    },
    hints: {
      type: [String],
      default: []
    },
    answerKey: {
      type: String,
      required: [true, 'Answer key is required'],
      select: false // Excluded from normal Mongoose queries & serialization
    },
    rubric: {
      type: [rubricCriterionSchema],
      validate: {
        validator: function (rubric) {
          if (!rubric || rubric.length === 0) return false;
          const totalWeight = rubric.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
          return Math.abs(totalWeight - 100) < 0.001;
        },
        message: 'Rubric criterion weights must sum to exactly 100'
      }
    },
    nextAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.answerKey;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.answerKey;
        return ret;
      }
    }
  }
);

// Pre-save validation for published assignments
assignmentSchema.pre('save', function () {
  if (this.status === 'published') {
    if (!this.title || !this.scenarioText || !this.expectedOutcome || !this.answerKey) {
      throw new Error('A published assignment must have a title, scenario, expected outcome, and answerKey');
    }
    if (!this.requirements || this.requirements.length === 0) {
      throw new Error('A published assignment must have at least one requirement');
    }
    if (!this.rubric || this.rubric.length === 0) {
      throw new Error('A published assignment must have a rubric');
    }
    const totalWeight = this.rubric.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      throw new Error(`Rubric weights must total 100 (current total: ${totalWeight})`);
    }
  }
});

export const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
