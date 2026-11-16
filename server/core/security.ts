import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getEnvConfig } from '../config.ts';

export type UserRole = 'learner' | 'mentor';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, originalHex] = parts;
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHex, 'hex');
  if (derivedBuffer.length !== originalBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

export function signAccessToken(user: { id: string; email: string; role: UserRole }): string {
  const cfg = getEnvConfig();
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, cfg.jwtSecret, { expiresIn: cfg.accessTokenExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(user: { id: string; email: string; role: UserRole }): string {
  const cfg = getEnvConfig();
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };
  return jwt.sign(payload, cfg.jwtRefreshSecret, { expiresIn: cfg.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): TokenPayload {
  const cfg = getEnvConfig();
  const decoded = jwt.verify(token, cfg.jwtSecret) as TokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const cfg = getEnvConfig();
  const decoded = jwt.verify(token, cfg.jwtRefreshSecret) as TokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
