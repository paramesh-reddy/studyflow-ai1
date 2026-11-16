import type { Request, Response } from 'express';
import { createApiApp } from '../server/app.ts';
import { initDatabase } from '../server/db/database.ts';

const app = createApiApp();
let databaseReady: Promise<void> | undefined;

function ensureApiPrefix(url: string | undefined): string {
  const raw = url && url.length > 0 ? url : '/';
  const queryIndex = raw.indexOf('?');
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : raw.slice(queryIndex);
  if (path === '/api' || path.startsWith('/api/')) return raw;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/api${normalized}${query}`;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({
      error: {
        code: 'SERVER_MISCONFIGURED',
        message: 'DATABASE_URL is not set for this deployment.',
      },
    });
    return;
  }

  req.url = ensureApiPrefix(req.url);

  if (!databaseReady) {
    databaseReady = initDatabase()
      .then(() => undefined)
      .catch((err: unknown) => {
        databaseReady = undefined;
        throw err;
      });
  }

  try {
    await databaseReady;
  } catch (err) {
    console.error('Database initialization failed:', err instanceof Error ? err.message : err);
    res.status(500).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database could not be reached. Check DATABASE_URL and redeploy.',
      },
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    res.once('finish', done);
    res.once('close', done);
    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}
