// src/index.js
// Nexora Backend — Express entry point

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import webhookRouter from './routes/webhook.js';
import customersRouter from './routes/customers.js';
import accountsRouter from './routes/accounts.js';
import transactionsRouter from './routes/transactions.js';
import invoicesRouter from './routes/invoices.js';
import merchantRouter from './routes/merchant.js';
import metaRouter from './routes/meta.js';
import publicApiRouter from './routes/publicApi.js';
import { runSeed } from './lib/seed.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CORS ──────────────────────────────────────────────────────────
// On Render, FRONTEND_URL should be your deployed frontend URL.
// Locally it's http://localhost:5173.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'https://nexora-recon.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Webhook BEFORE express.json() ─────────────────────────────────
// express.raw() is applied inside the webhook route itself.
app.use(webhookRouter);

// ── JSON body parser ──────────────────────────────────────────────
app.use(express.json());

// ── Static file downloads ─────────────────────────────────────────
app.get('/openapi.json', (req, res) => {
  try {
    const spec = readFileSync(join(__dirname, '../openapi.json'), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(spec);
  } catch {
    res.status(404).json({ error: 'openapi.json not found' });
  }
});

app.get('/postman_collection.json', (req, res) => {
  try {
    const col = readFileSync(join(__dirname, '../postman_collection.json'), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="nexora_postman.json"');
    res.send(col);
  } catch {
    res.status(404).json({ error: 'postman_collection.json not found' });
  }
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nexora-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    db: process.env.DATABASE_PROVIDER || 'sqlite',
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/customers', customersRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api', transactionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/services', merchantRouter);
app.use('/api', metaRouter);
app.use('/api/public/v1', publicApiRouter);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start server ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 Nexora backend running on port ${PORT}`);
  console.log(`   Health:     /health`);
  console.log(`   Webhooks:   /webhooks/nomba`);
  console.log(`   Public API: /api/public/v1`);
  console.log(`   Database:   ${process.env.DATABASE_PROVIDER || 'sqlite'}`);
  console.log(`   Env:        ${process.env.NODE_ENV || 'development'}\n`);

  // ── Auto-seed on first boot ──────────────────────────────────────
  // Set AUTO_SEED=true in Render environment variables.
  // The seed function is idempotent — safe even if called multiple times.
  if (process.env.AUTO_SEED === 'true') {
    console.log('[boot] AUTO_SEED=true — running seed...');
    try {
      await runSeed();
      console.log('[boot] Seed completed successfully.');
    } catch (err) {
      console.error('[boot] Seed failed (non-fatal):', err.message);
    }
  }
});

export default app;