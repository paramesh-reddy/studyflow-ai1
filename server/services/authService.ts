import { v4 as uuidv4 } from 'uuid';
import { getDb, toIsoString } from '../db/database.ts';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../core/security.ts';
import type { UserRole } from '../core/security.ts';
import { ConflictError, UnauthorizedError, ValidationError } from '../core/errors.ts';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export async function registerLearner(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  const email = (input.email || '').trim().toLowerCase();
  const name = (input.name || '').trim();
  const password = input.password || '';

  if (!email || !email.includes('@')) {
    throw new ValidationError('A valid email address is required');
  }
  if (name.length < 2 || name.length > 80) {
    throw new ValidationError('Name must be between 2 and 80 characters');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const db = getDb();
  const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    email,
  ]);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const id = uuidv4();
  const passwordHash = hashPassword(password);
  const createdAt = new Date().toISOString();
  const role: UserRole = 'learner';

  await db.execute(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, email, name, passwordHash, role, createdAt]
  );

  const user: PublicUser = { id, email, name, role, createdAt };
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthResponse> {
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const db = getDb();
  const row = await db.queryOne<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: UserRole;
    created_at: string | Date;
  }>('SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = $1', [
    email,
  ]);

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user: PublicUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: toIsoString(row.created_at) || '',
  };

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function refreshUserSession(refreshToken: string): Promise<AuthResponse> {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const db = getDb();
  const row = await db.queryOne<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    created_at: string | Date;
  }>('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [payload.sub]);

  if (!row) {
    throw new UnauthorizedError('User account no longer exists');
  }

  const user: PublicUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: toIsoString(row.created_at) || '',
  };

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}
