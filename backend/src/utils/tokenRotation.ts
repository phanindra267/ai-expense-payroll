import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  organisationId: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload): { token: string; hash: string } {
  const uniquePayload = { ...payload, jti: crypto.randomBytes(16).toString('hex') };
  const token = jwt.sign(uniquePayload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  const hash = hashToken(token);
  return { token, hash };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generatePasswordResetToken(): { token: string; hash: string; expiry: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, hash, expiry };
}
