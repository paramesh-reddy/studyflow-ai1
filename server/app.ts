import express from 'express';
import cors from 'cors';
import { getEnvConfig } from './config.ts';
import { createV1Router } from './api/v1/router.ts';
import { errorHandler } from './core/middleware.ts';

export function createApiApp(): express.Express {
  const app = express();
  const cfg = getEnvConfig();

  // Trust Vercel's proxy hop so rate limiting can read the client IP.
  // A numeric hop count is required; `true` is rejected by express-rate-limit.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: cfg.corsOrigin === '*' ? true : cfg.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', createV1Router());

  // Centralized error handler for API routes
  app.use('/api', errorHandler);

  return app;
}
