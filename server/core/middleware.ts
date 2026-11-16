import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './security.ts';
import type { UserRole } from './security.ts';
import { AppError, ForbiddenError, UnauthorizedError } from './errors.ts';
import { getDb, toIsoString } from '../db/database.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    const db = getDb();
    const row = await db.queryOne<{
      id: string;
      email: string;
      name: string;
      role: UserRole;
      created_at: string | Date;
    }>('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [payload.sub]);

    if (!row) {
      next(new UnauthorizedError('User account no longer exists'));
      return;
    }

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: toIsoString(row.created_at) || '',
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

export function requireMentor(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  if (req.user.role !== 'mentor') {
    next(new ForbiddenError('Mentor or administrator role required'));
    return;
  }
  next();
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error('Unhandled API error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred. Please try again.',
    },
  });
}
