import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN');
    }
  }

  async register({ name, email, password, role = 'student' }) {
    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await User.hashPassword(password);
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'student',
      status: 'active'
    });

    await user.save();
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      token
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'disabled') {
      throw new AppError('Account has been disabled', 403, 'ACCOUNT_DISABLED');
    }

    if (user.status === 'invited') {
      throw new AppError('Please accept your invitation first to set a password', 403, 'INVITATION_PENDING');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      token
    };
  }

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  async acceptInvitation({ invitationToken, password, name }) {
    if (!invitationToken || !password) {
      throw new AppError('Invitation token and password are required', 400, 'VALIDATION_ERROR');
    }

    const tokenHash = User.hashToken(invitationToken);
    const user = await User.findOne({
      invitationTokenHash: tokenHash,
      invitationTokenExpires: { $gt: new Date() }
    }).select('+invitationTokenHash');

    if (!user) {
      throw new AppError('Invalid or expired invitation token', 400, 'INVALID_INVITATION_TOKEN');
    }

    user.passwordHash = await User.hashPassword(password);
    if (name) user.name = name.trim();
    user.status = 'active';
    user.invitationTokenHash = null;
    user.invitationTokenExpires = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      token
    };
  }
}

export const authService = new AuthService();
export default authService;

