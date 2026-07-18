import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import authRouter from './auth/uber.js';
import driverRouter from './routes/driver.js';
import analysisRouter from './routes/analysis.js';
import surgeRouter from './routes/surge.js';
import categoriesRouter from './routes/categories.js';
import shiftsRouter from './routes/shifts.js';
import manualRouter from './routes/manual.js';
import { startSurgePolling } from './cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', (req, res) => res.json({ ok: true, demoMode: config.demoMode }));

app.use('/auth', authRouter);
app.use('/api/driver', driverRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/surge', surgeRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/manual', manualRouter);

// Serve the built React client if present (production / single-process mode).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/auth).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Centralized error handler with user-friendly messaging.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({
    error: err.message || 'Unexpected server error',
    hint: status === 403 ? 'Driver API access may still be pending approval. The app continues on cached/demo data.' : undefined,
  });
});

app.listen(config.port, () => {
  console.log(`\n  DFW Uber Earnings Maximizer`);
  console.log(`  API  → http://localhost:${config.port}/api/health`);
  console.log(`  Mode → ${config.demoMode ? 'DEMO (no live Uber credentials)' : 'LIVE'}`);
  if (fs.existsSync(clientDist)) console.log(`  App  → http://localhost:${config.port}`);
  else console.log(`  App  → run "npm run client:dev" for the React dev server (port 5173)`);
  startSurgePolling();
});
