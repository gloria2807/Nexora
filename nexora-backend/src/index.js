// src/index.js
// Nexora Backend — Express entry point

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import webhookRouter from './routes/webhook.js';
import customersRouter from './routes/customers.js';
import accountsRouter from './routes/accounts.js';
import transactionsRouter from './routes/transactions.js';
import invoicesRouter from './routes/invoices.js';
import merchantRouter from './routes/merchant.js';
import metaRouter from './routes/meta.js';
import publicApiRouter from './routes/publicApi.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3001',
  ],
  credentials: true,
}));

// ── Webhook BEFORE express.json() ─────────────────────────────────
// Needs raw Buffer for HMAC verification (express.raw applied in the route)
app.use(webhookRouter);

// ── JSON body parser ──────────────────────────────────────────────
app.use(express.json());

// ── Static downloads for Developers page ─────────────────────────
// Frontend fetches /openapi.json and /postman_collection.json directly
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

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
  });
});

// ── Internal dashboard API ────────────────────────────────────────

// Customers
app.use('/api/customers', customersRouter);

// Accounts (virtual account provisioning)
app.use('/api/accounts', accountsRouter);

// Transactions:  GET /api/transactions
//                POST /api/simulate
//                GET /api/exceptions
//                POST /api/exceptions/:id/resolve
//                GET /api/reconciliation/report
//                GET /api/statements/:accountId
app.use('/api', transactionsRouter);

// Invoices
app.use('/api/invoices', invoicesRouter);

// Merchant:  GET  /api/merchant/balance
//            GET  /api/merchant/settlements
//            GET  /api/services             (services list)
//            GET  /api/services/approvals
//            POST /api/services/pay
//            POST /api/services/:id/approve
//            POST /api/services/:id/reject
app.use('/api/merchant', merchantRouter);
app.use('/api/services', merchantRouter);

// Meta:  GET /api/me
//        GET /api/docs
//        POST /api/seed
app.use('/api', metaRouter);

// ── Public Developer API ───────────────────────────────────────────
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

app.listen(PORT, () => {
  console.log(`\n🚀 Nexora backend running on http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/health`);
  console.log(`   Webhooks:   http://localhost:${PORT}/webhooks/nomba`);
  console.log(`   Public API: http://localhost:${PORT}/api/public/v1`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
