import express from 'express';
import cors from 'cors';
import { getEnvConfig } from './config.ts';
import { createV1Router } from './api/v1/router.ts';
import { errorHandler } from './core/middleware.ts';

export function createApiApp(): express.Express {
  const app = express();
  const cfg = getEnvConfig();

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
