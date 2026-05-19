import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Organisation from '../models/Organisation';
import User from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generatePasswordResetToken,
} from '../utils/tokenRotation';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// ─── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orgName, email, password } = req.body;
    if (!orgName || !email || !password) {
      throw new AppError('orgName, email and password are required', 400, 'VALIDATION_ERROR');
    }
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');

    const org = await Organisation.create({ name: orgName });
    const user = await User.create({
      email,
      passwordHash: password, // pre-save hook hashes it
      name: req.body.name || email.split('@')[0],
      role: 'admin',
      organisationId: org._id,
    });

    const payload = { userId: String(user._id), organisationId: String(org._id), role: user.role };
    const accessToken = generateAccessToken(payload);
    const { token: refreshToken, hash } = generateRefreshToken(payload);
    user.refreshTokens.push({
      tokenHash: hash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false
    });
    await user.save();

    logger.info('User registered', { userId: user._id, orgId: org._id });
    res.status(201).json({ accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role, organisationId: user.organisationId } });
  } catch (err) {
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const payload = { userId: String(user._id), organisationId: String(user.organisationId), role: user.role };
    const accessToken = generateAccessToken(payload);
    const { token: refreshToken, hash } = generateRefreshToken(payload);
    user.refreshTokens.push({
      tokenHash: hash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false
    });
    await user.save();

    logger.info('User logged in', { userId: user._id });
    res.json({ accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR');

    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'TOKEN_INVALID');
    }

    const tokenHash = hashToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const tokenIndex = user.refreshTokens.findIndex(t => t.tokenHash === tokenHash);
    if (tokenIndex === -1) {
      // Reuse detection — revoke ALL tokens
      user.refreshTokens = [];
      await user.save();
      logger.warn('Refresh token reuse detected — all tokens revoked', { userId: user._id });
      throw new AppError('Token reuse detected. Please login again.', 401, 'TOKEN_REUSE');
    }

    // Rotate: remove old, issue new
    user.refreshTokens.splice(tokenIndex, 1);
    const newPayload = { userId: String(user._id), organisationId: String(user.organisationId), role: user.role };
    const accessToken = generateAccessToken(newPayload);
    const { token: newRefreshToken, hash: newHash } = generateRefreshToken(newPayload);
    user.refreshTokens.push({
      tokenHash: newHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false
    });
    await user.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      await User.findOneAndUpdate(
        { 'refreshTokens.tokenHash': hash },
        { $pull: { refreshTokens: { tokenHash: hash } } }
      );
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Logout All ──────────────────────────────────────────────────────────────
export async function logoutAll(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    await User.findByIdAndUpdate(req.user.userId, { refreshTokens: [] });
    res.json({ message: 'All sessions terminated' });
  } catch (err) {
    next(err);
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always respond 200 to prevent email enumeration
    if (!user) { res.json({ message: 'If that email exists, a reset link was sent.' }); return; }

    const { token, hash, expiry } = generatePasswordResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpiry = expiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    });

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Token and password required', 400, 'VALIDATION_ERROR');

    const hash = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hash,
      passwordResetExpiry: { $gt: new Date() },
    });
    if (!user) throw new AppError('Invalid or expired reset token', 400, 'TOKEN_INVALID');

    user.passwordHash = password; // pre-save hook re-hashes
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = []; // revoke all sessions
    await user.save();

    res.json({ message: 'Password reset successfully. Please login.' });
  } catch (err) {
    next(err);
  }
}
