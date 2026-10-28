import authService from '../services/auth.service.js';
import enrollmentService from '../services/enrollment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import env from '../config/env.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register({ name, email, password, role });

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json({
    success: true,
    data: result
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id || req.user._id);
  res.status(200).json({
    success: true,
    data: user
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token, password, name } = req.body;
  const result = await enrollmentService.acceptInvitation({ token, password, name });
  const authToken = authService.generateToken(result.user);

  res.cookie('token', authToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({
    success: true,
    data: {
      ...result,
      token: authToken
    }
  });
});

