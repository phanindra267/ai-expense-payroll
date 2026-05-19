import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  if (!text) return text;
  // Convert key to buffer, ensuring it's exactly 32 bytes.
  // In production, ENCRYPTION_KEY should be a 64-char hex string (32 bytes).
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 64).padEnd(64, '0'), 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  
  const textParts = text.split(':');
  if (textParts.length !== 3) return text; // Not our encrypted format
  
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const authTag = Buffer.from(textParts[2], 'hex');
  
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 64).padEnd(64, '0'), 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
