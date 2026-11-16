import type { Request, Response } from 'express';
import { createApiApp } from '../server/app.ts';
import { initDatabase } from '../server/db/database.ts';

const app = createApiApp();
let databaseReady: Promise<void> | undefined;

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured for the Vercel API.');
  }

  if (!databaseReady) {
    databaseReady = initDatabase()
      .then(() => undefined)
      .catch((err: unknown) => {
        databaseReady = undefined;
        throw err;
      });
  }

  await databaseReady;
  app(req, res);
}
