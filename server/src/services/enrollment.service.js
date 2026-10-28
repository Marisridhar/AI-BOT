import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import emailService from './email.service.js';
import progressService from './progress.service.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

export class EnrollmentService {
  async inviteStudent({ courseId, email, name }) {
    if (!email || !name) {
      throw new AppError('Student email and name are required', 400, 'VALIDATION_ERROR');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    if (course.status !== 'published') {
      throw new AppError('Cannot enroll students in an unpublished course', 400, 'COURSE_NOT_PUBLISHED');
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    // Generate random invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = User.hashToken(rawToken);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!user) {
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        role: 'student',
        status: 'invited',
        invitationTokenHash: tokenHash,
        invitationTokenExpires: expires
      });
      await user.save();
    } else {
      user.invitationTokenHash = tokenHash;
      user.invitationTokenExpires = expires;
      await user.save();
    }

    // Check if duplicate enrollment exists
    const existingEnrollment = await CourseEnrollment.findOne({
      courseId: course._id,
      studentId: user._id
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'revoked') {
        existingEnrollment.status = 'invited';
        existingEnrollment.invitationTokenHash = tokenHash;
        existingEnrollment.invitationTokenExpires = expires;
        await existingEnrollment.save();
        await emailService.sendInvitationEmail({ user, course, rawToken });
        return { enrollment: existingEnrollment, rawToken };
      }
      throw new AppError('Student is already enrolled or invited to this course', 409, 'ALREADY_ENROLLED');
    }

    const enrollment = new CourseEnrollment({
      courseId: course._id,
      studentId: user._id,
      status: 'invited',
      invitedAt: new Date(),
      courseVersion: course.version,
      invitationTokenHash: tokenHash,
      invitationTokenExpires: expires
    });

    await enrollment.save();

    // Send invitation email
    await emailService.sendInvitationEmail({ user, course, rawToken });

    return {
      enrollment,
      rawToken // Returned for testing / development without checking inbox
    };
  }

  async acceptInvitation({ token, password, name }) {
    if (!token || !password) {
      throw new AppError('Token and password are required', 400, 'VALIDATION_ERROR');
    }

    const tokenHash = User.hashToken(token);
    const enrollment = await CourseEnrollment.findOne({
      invitationTokenHash: tokenHash,
      invitationTokenExpires: { $gt: new Date() }
    }).select('+invitationTokenHash');

    if (!enrollment) {
      throw new AppError('Invalid or expired course invitation token', 400, 'INVALID_INVITATION_TOKEN');
    }

    const user = await User.findById(enrollment.studentId).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    user.passwordHash = await User.hashPassword(password);
    if (name) user.name = name.trim();
    user.status = 'active';
    user.invitationTokenHash = null;
    user.invitationTokenExpires = null;
    await user.save();

    enrollment.status = 'active';
    enrollment.enrolledAt = new Date();
    enrollment.invitationTokenHash = null;
    enrollment.invitationTokenExpires = null;
    await enrollment.save();

    // Initialize module & lesson progress for this enrollment
    await progressService.initializeProgress(enrollment._id);

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      enrollmentId: enrollment._id
    };
  }

  async enrollStudentDirectly({ courseId, studentId }) {
    const course = await Course.findById(courseId);
    if (!course || course.status !== 'published') {
      throw new AppError('Course is not available for enrollment', 400, 'COURSE_UNAVAILABLE');
    }

    const existing = await CourseEnrollment.findOne({ courseId, studentId });
    if (existing) {
      throw new AppError('Student is already enrolled in this course', 409, 'ALREADY_ENROLLED');
    }

    const enrollment = new CourseEnrollment({
      courseId,
      studentId,
      status: 'active',
      enrolledAt: new Date(),
      courseVersion: course.version
    });

    await enrollment.save();
    await progressService.initializeProgress(enrollment._id);
    return enrollment;
  }

  async listEnrollments(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new AppError('Invalid course ID', 400, 'INVALID_ID');
    }
    return CourseEnrollment.find({ courseId })
      .populate('studentId', 'name email role status')
      .sort({ createdAt: -1 });
  }

  async getStudentEnrollment(enrollmentId, studentId) {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw new AppError('Invalid enrollment ID', 400, 'INVALID_ID');
    }
    const enrollment = await CourseEnrollment.findById(enrollmentId).populate('courseId');
    if (!enrollment) {
      throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
    }

    if (studentId && enrollment.studentId.toString() !== studentId.toString()) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return enrollment;
  }

  async revokeEnrollment(enrollmentId) {
    const enrollment = await CourseEnrollment.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
    }
    enrollment.status = 'revoked';
    await enrollment.save();
    return enrollment;
  }
}

export const enrollmentService = new EnrollmentService();
export default enrollmentService;

