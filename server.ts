import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';
import { initDatabase } from './server/db/database.ts';
import { seedDatabaseIfEmpty } from './server/db/seed.ts';
import { getEnvConfig } from './server/config.ts';

async function startServer() {
  const cfg = getEnvConfig();

  // Initialize PostgreSQL (or fallback) schema & seed realistic demo data on first boot
  const db = await initDatabase();
  const seeded = await seedDatabaseIfEmpty();
  console.log(
    `StudyFlow AI database connected (${db.dialect}${db.pgvectorEnabled ? ' + pgvector' : ''}).${
      seeded ? ' Initialized and seeded with demo data.' : ''
    }`
  );

  const app = createApiApp();

  if (cfg.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(cfg.port, '0.0.0.0', () => {
    console.log(`StudyFlow AI server listening on http://0.0.0.0:${cfg.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StudyFlow AI server:', err);
  process.exit(1);
});
