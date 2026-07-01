// src/routes/meta.js
// /api/me, /api/docs (OpenAPI), /api/seed

import express from 'express';
import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { reconcileInboundTransfer } from '../services/reconciliation.js';

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
router.post('/seed', async (req, res) => {
  try {
    // ── Merchant ──────────────────────────────────────────────────
    const existingMerchant = await prisma.merchant.findFirst();
    if (!existingMerchant) {
      await prisma.merchant.create({
        data: {
          id: uuidv4(),
          name: 'Nexora Demo Merchant',
          email: 'admin@nexora.dev',
          apiKey: `nxr_live_${uuidv4().replace(/-/g, '').slice(0, 32)}`,
          webhookSecret: 'NombaHackathon2026',
          nombaAccountId: process.env.NOMBA_ACCOUNT_ID || 'demo_account_id',
          merchantBalance: 2_450_000,
        },
      });
    }
    const merchant = await prisma.merchant.findFirst();

    // ── Customers ─────────────────────────────────────────────────
    const customerData = [
      { firstName: 'Adaeze', lastName: 'Okafor', email: 'adaeze@acmecorp.ng',  phone: '08012345678', bvn: '12345678901', kycTier: 2 },
      { firstName: 'Emeka',  lastName: 'Nwosu',  email: 'emeka@globex.ng',     phone: '08087654321', bvn: null,          kycTier: 1 },
      { firstName: 'Fatima', lastName: 'Aliyu',  email: 'fatima@initech.ng',   phone: '07011223344', bvn: '98765432109', kycTier: 2 },
      { firstName: 'Chidi',  lastName: 'Eze',    email: 'chidi@umbrella.ng',   phone: '09023456789', bvn: null,          kycTier: 1 },
    ];

    const customers = [];
    for (const cd of customerData) {
      const c = await prisma.customer.upsert({
        where: { email: cd.email },
        update: {},
        create: { id: uuidv4(), ...cd },
      });
      customers.push(c);
    }

    // ── Virtual Accounts ──────────────────────────────────────────
    const accountDefs = [
      { accountName: 'ACME CORP COLLECTIONS', bankName: 'Nombank MFB', accountNumber: '9391076543' },
      { accountName: 'GLOBEX PAYMENTS',        bankName: 'Nombank MFB', accountNumber: '9391076544' },
      { accountName: 'INITECH INVOICES',       bankName: 'Nombank MFB', accountNumber: '9391076545' },
      { accountName: 'UMBRELLA TRANSFERS',     bankName: 'Nombank MFB', accountNumber: '9391076546' },
    ];

    const virtualAccounts = [];
    for (let i = 0; i < customers.length; i++) {
      const shortId = customers[i].id.replace(/-/g, '').slice(0, 8);
      const accountRef = `nexora_${shortId}_seed${i}x01`;

      const va = await prisma.virtualAccount.upsert({
        where: { accountRef },
        update: {},
        create: {
          id: uuidv4(),
          accountName: accountDefs[i].accountName,
          accountRef,
          accountNumber: accountDefs[i].accountNumber,
          bankName: accountDefs[i].bankName,
          status: 'ACTIVE',
          balance: 0,
          customerId: customers[i].id,
        },
      });
      virtualAccounts.push(va);
    }

    // ── Invoices (deterministic refs — idempotent) ─────────────────
    const invoiceDefs = [
      { customerId: customers[0].id, amount: 120_000, daysFromNow: 7  },
      { customerId: customers[1].id, amount:  52_000, daysFromNow: 3  },
      { customerId: customers[2].id, amount:  24_000, daysFromNow: 14 },
      { customerId: customers[3].id, amount:  40_000, daysFromNow: 5  },
    ];

    const invoices = [];
    for (let idx = 0; idx < invoiceDefs.length; idx++) {
      const def = invoiceDefs[idx];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + def.daysFromNow);
      const seedRef = `INV-SEED-C${idx}-V1`;

      const inv = await prisma.invoice.upsert({
        where: { reference: seedRef },
        update: {},
        create: {
          id: uuidv4(),
          reference: seedRef,
          amount: def.amount,
          dueDate,
          customerId: def.customerId,
          status: 'PENDING',
        },
      });
      invoices.push(inv);
    }

    // ── Transactions — deterministic requestIds so re-seed is safe ─
    //
    // TXN 1: Adaeze pays ₦120,000 → MATCHED (exact)
    const t1 = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t1_adaeze_matched' } });
    if (!t1) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[0].accountRef,
        amount: 120_000,
        senderName: 'Adaeze Okafor',
        senderAccount: '0000000001',
        narration: 'Invoice INV-SEED-C0-V1 payment',
        nombaRequestId: 'seed_t1_adaeze_matched',
        nombaSessionId: 'seed_session_t1',
      });
    }

    // TXN 2: Emeka pays ₦52,000 → MATCHED (exact)
    const t2 = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t2_emeka_matched' } });
    if (!t2) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[1].accountRef,
        amount: 52_000,
        senderName: 'Emeka Nwosu',
        senderAccount: '0000000002',
        narration: 'Payment for INV-SEED-C1-V1',
        nombaRequestId: 'seed_t2_emeka_matched',
        nombaSessionId: 'seed_session_t2',
      });
    }

    // TXN 3: Fatima pays ₦18,000 of her ₦24,000 invoice → PARTIAL
    const t3 = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t3_fatima_partial' } });
    if (!t3) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[2].accountRef,
        amount: 18_000,
        senderName: 'Fatima Aliyu',
        senderAccount: '0000000003',
        narration: 'Part payment — will complete shortly',
        nombaRequestId: 'seed_t3_fatima_partial',
        nombaSessionId: 'seed_session_t3',
      });
    }

    // TXN 4: Fatima pays remaining ₦6,000 → MATCHED (closes the invoice)
    const t4 = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t4_fatima_close' } });
    if (!t4) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[2].accountRef,
        amount: 6_000,
        senderName: 'Fatima Aliyu',
        senderAccount: '0000000003',
        narration: 'Balance of INV-SEED-C2-V1',
        nombaRequestId: 'seed_t4_fatima_close',
        nombaSessionId: 'seed_session_t4',
      });
    }

    // TXN 5: Fatima sends ₦50,000 — invoice already PAID, no open invoice left
    // → triggers OVERPAYMENT exception
    const t5 = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t5_fatima_overpay' } });
    if (!t5) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[2].accountRef,
        amount: 50_000,
        senderName: 'Fatima Aliyu',
        senderAccount: '0000000003',
        narration: 'Accidental duplicate — please refund',
        nombaRequestId: 'seed_t5_fatima_overpay',
        nombaSessionId: 'seed_session_t5',
      });
    }

    // TXN 6: Unknown sender pays ₦15,000 to Chidi's account
    // Chidi's invoice for ₦40,000 is still PENDING — but this amount
    // is less than the invoice so it lands as PARTIAL, not UNMATCHED.
    // To get a clean UNMATCHED, we first pay Chidi's invoice in full...
    const t6a = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t6a_chidi_invoice' } });
    if (!t6a) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[3].accountRef,
        amount: 40_000,
        senderName: 'Chidi Eze',
        senderAccount: '0000000004',
        narration: 'Full payment INV-SEED-C3-V1',
        nombaRequestId: 'seed_t6a_chidi_invoice',
        nombaSessionId: 'seed_session_t6a',
      });
    }

    // ...then fire a mystery payment with no open invoice to match → UNMATCHED exception
    const t6b = await prisma.transaction.findUnique({ where: { nombaRequestId: 'seed_t6b_chidi_unmatched' } });
    if (!t6b) {
      await reconcileInboundTransfer({
        accountRef: virtualAccounts[3].accountRef,
        amount: 15_000,
        senderName: 'Unknown Sender',
        senderAccount: '0099887766',
        narration: 'REF: XYZ-991 — no invoice reference',
        nombaRequestId: 'seed_t6b_chidi_unmatched',
        nombaSessionId: 'seed_session_t6b',
      });
    }

    // ── Merchant Services ─────────────────────────────────────────
    const serviceDefs = [
      { type: 'AIRTIME',       destination: '08000000001', amount: 5_000,   status: 'SUCCESS',          ref: 'SVC-SEED-001' },
      { type: 'DATA',          destination: '08000000002', amount: 3_000,   status: 'SUCCESS',          ref: 'SVC-SEED-002' },
      { type: 'AIRTIME',       destination: '08000000003', amount: 2_000,   status: 'FAILED',           ref: 'SVC-SEED-003' },
      { type: 'BANK TRANSFER', destination: '044:01234567', amount: 850_000, status: 'PENDING_APPROVAL', ref: 'SVC-SEED-004' },
      { type: 'ELECTRICITY',   destination: '45300000001', amount: 10_000,  status: 'SUCCESS',          ref: 'SVC-SEED-005' },
    ];

    for (const svc of serviceDefs) {
      const existing = await prisma.merchantService.findUnique({ where: { reference: svc.ref } });
      if (!existing) {
        await prisma.merchantService.create({
          data: {
            id: uuidv4(),
            type: svc.type,
            destination: svc.destination,
            amount: svc.amount,
            status: svc.status,
            reference: svc.ref,
            merchantId: merchant.id,
          },
        });
      }
    }

    // ── Settlement ────────────────────────────────────────────────
    const settlementRef = 'STLMT-SEED-001';
    const existingSettlement = await prisma.settlement.findUnique({ where: { reference: settlementRef } });
    if (!existingSettlement) {
      await prisma.settlement.create({
        data: {
          id: uuidv4(),
          amount: 8_200_000,
          status: 'COMPLETED',
          reference: settlementRef,
          merchantId: merchant.id,
        },
      });
    }

    res.json({ success: true, message: 'Demo data seeded successfully' });
  } catch (err) {
    console.error('[seed] error:', err);
    res.status(500).json({ error: 'Seeding failed: ' + err.message });
  }
});

export default router;
