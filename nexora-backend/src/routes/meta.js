// src/routes/meta.js
// /api/me, /api/docs (OpenAPI), /api/seed

import express from 'express';
import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/me
router.get('/me', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findFirst();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    res.json({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch merchant profile' });
  }
});

// GET /api/docs — returns OpenAPI spec for the Developers page
router.get('/docs', (req, res) => {
  const spec = {
    openapi: '3.0.1',
    info: {
      title: 'Nexora API',
      version: '1.0.0',
      description: 'Dedicated Virtual Account & Reconciliation Engine — Powered by Nomba',
    },
    paths: {
      '/api/public/v1/virtual-accounts': {
        post: { description: 'Provision a customer-named dedicated virtual account. Returns a permanent NUBAN the customer can use for all transfers.' },
        get: { description: 'List all virtual accounts under your merchant. Supports ?customerId filter.' },
      },
      '/api/public/v1/virtual-accounts/{accountRef}': {
        get: { description: 'Fetch a single virtual account with current balance and status.' },
        patch: { description: 'Rename a virtual account or update its status (ACTIVE, FROZEN, CLOSED). Edge: cannot reactivate a CLOSED account.' },
        delete: { description: 'Close a virtual account permanently. Blocked if balance > 0 unless ?force=true.' },
      },
      '/api/public/v1/statements/{accountRef}': {
        get: { description: 'Get the full ledger statement for a virtual account: every credit, debit, and running balance.' },
      },
      '/api/public/v1/reconciliation/report': {
        get: { description: 'Get reconciliation metrics: efficiency %, matched vs unmatched counts, and total naira volumes.' },
      },
      '/api/public/v1/exceptions': {
        get: { description: 'List all unmatched, overpaid, or misdirected transactions awaiting manual review.' },
      },
      '/api/public/v1/exceptions/{id}/resolve': {
        post: { description: 'Manually resolve an exception — marks it matched and updates the transaction record.' },
      },
      '/api/public/v1/transfers': {
        post: { description: 'Initiate an outbound bank transfer or wallet transfer from your Nexora merchant balance.' },
      },
      '/webhooks/nomba': {
        post: { description: 'Nomba webhook receiver. Verifies HMAC-SHA256 signature, deduplicates by requestId, and triggers reconciliation.' },
      },
    },
  };

  res.json(spec);
});

// POST /api/seed — populate demo data for judges
// Fully idempotent: all upserts use deterministic keys. Safe to run multiple times.
// Produces the following transaction mix for the Reconciliation page:
//   MATCHED   — Adaeze pays ₦120,000 (exact match on her invoice)
//   MATCHED   — Emeka pays ₦52,000  (exact match on his invoice)
//   PARTIAL   — Fatima pays ₦18,000 of her ₦24,000 invoice
//   MATCHED   — Fatima pays remaining ₦6,000  (closes the partial)
//   OVERPAYMENT exception — Fatima sends another ₦50,000 (no open invoice left)
//   UNMATCHED exception   — Unknown sender pays ₦15,000 to Chidi's account (no invoice)
import { runSeed } from '../lib/seed.js';

// POST /api/seed
router.post('/seed', async (req, res) => {
  try {
    const result = await runSeed();
    res.json(result);
  } catch (err) {
    console.error('[seed] error:', err);
    res.status(500).json({ error: 'Seeding failed: ' + err.message });
  }
});

export default router;