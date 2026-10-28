import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.status !== 'invited';
      },
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'student'],
      default: 'student',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'disabled'],
      default: 'active',
      index: true
    },
    invitationTokenHash: {
      type: String,
      select: false,
      default: null
    },
    invitationTokenExpires: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.invitationTokenHash;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.invitationTokenHash;
        return ret;
      }
    }
  }
);

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

userSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
export default User;
