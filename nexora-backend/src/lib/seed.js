// src/lib/seed.js
// Extracted seed logic — callable from the API route AND from auto-boot.
// Fully idempotent: all upserts use deterministic keys.

import prisma from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { reconcileInboundTransfer } from '../services/reconciliation.js';

export async function runSeed() {
  // ── Merchant ────────────────────────────────────────────────────
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

  // ── Customers ────────────────────────────────────────────────────
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

  // ── Virtual Accounts ─────────────────────────────────────────────
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

  // ── Invoices ─────────────────────────────────────────────────────
  const invoiceDefs = [
    { customerId: customers[0].id, amount: 120_000, daysFromNow: 7  },
    { customerId: customers[1].id, amount:  52_000, daysFromNow: 3  },
    { customerId: customers[2].id, amount:  24_000, daysFromNow: 14 },
    { customerId: customers[3].id, amount:  40_000, daysFromNow: 5  },
  ];

  for (let idx = 0; idx < invoiceDefs.length; idx++) {
    const def = invoiceDefs[idx];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.daysFromNow);
    const seedRef = `INV-SEED-C${idx}-V1`;

    await prisma.invoice.upsert({
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
  }

  // ── Transactions ──────────────────────────────────────────────────
  const txns = [
    {
      id: 'seed_t1_adaeze_matched',
      accountRef: virtualAccounts[0].accountRef,
      amount: 120_000,
      senderName: 'Adaeze Okafor',
      senderAccount: '0000000001',
      narration: 'Invoice INV-SEED-C0-V1 payment',
      sessionId: 'seed_session_t1',
    },
    {
      id: 'seed_t2_emeka_matched',
      accountRef: virtualAccounts[1].accountRef,
      amount: 52_000,
      senderName: 'Emeka Nwosu',
      senderAccount: '0000000002',
      narration: 'Payment for INV-SEED-C1-V1',
      sessionId: 'seed_session_t2',
    },
    {
      id: 'seed_t3_fatima_partial',
      accountRef: virtualAccounts[2].accountRef,
      amount: 18_000,
      senderName: 'Fatima Aliyu',
      senderAccount: '0000000003',
      narration: 'Part payment — will complete shortly',
      sessionId: 'seed_session_t3',
    },
    {
      id: 'seed_t4_fatima_close',
      accountRef: virtualAccounts[2].accountRef,
      amount: 6_000,
      senderName: 'Fatima Aliyu',
      senderAccount: '0000000003',
      narration: 'Balance of INV-SEED-C2-V1',
      sessionId: 'seed_session_t4',
    },
    {
      id: 'seed_t5_fatima_overpay',
      accountRef: virtualAccounts[2].accountRef,
      amount: 50_000,
      senderName: 'Fatima Aliyu',
      senderAccount: '0000000003',
      narration: 'Accidental duplicate — please refund',
      sessionId: 'seed_session_t5',
    },
    {
      id: 'seed_t6a_chidi_invoice',
      accountRef: virtualAccounts[3].accountRef,
      amount: 40_000,
      senderName: 'Chidi Eze',
      senderAccount: '0000000004',
      narration: 'Full payment INV-SEED-C3-V1',
      sessionId: 'seed_session_t6a',
    },
    {
      id: 'seed_t6b_chidi_unmatched',
      accountRef: virtualAccounts[3].accountRef,
      amount: 15_000,
      senderName: 'Unknown Sender',
      senderAccount: '0099887766',
      narration: 'REF: XYZ-991 — no invoice reference',
      sessionId: 'seed_session_t6b',
    },
  ];

  for (const txn of txns) {
    const existing = await prisma.transaction.findUnique({
      where: { nombaRequestId: txn.id },
    });
    if (!existing) {
      await reconcileInboundTransfer({
        accountRef: txn.accountRef,
        amount: txn.amount,
        senderName: txn.senderName,
        senderAccount: txn.senderAccount,
        narration: txn.narration,
        nombaRequestId: txn.id,
        nombaSessionId: txn.sessionId,
      });
    }
  }

  // ── Merchant Services ─────────────────────────────────────────────
  const serviceDefs = [
    { type: 'AIRTIME',       destination: '08000000001', amount: 5_000,    status: 'SUCCESS',          ref: 'SVC-SEED-001' },
    { type: 'DATA',          destination: '08000000002', amount: 3_000,    status: 'SUCCESS',          ref: 'SVC-SEED-002' },
    { type: 'AIRTIME',       destination: '08000000003', amount: 2_000,    status: 'FAILED',           ref: 'SVC-SEED-003' },
    { type: 'BANK TRANSFER', destination: '044:01234567', amount: 850_000, status: 'PENDING_APPROVAL', ref: 'SVC-SEED-004' },
    { type: 'ELECTRICITY',   destination: '45300000001', amount: 10_000,   status: 'SUCCESS',          ref: 'SVC-SEED-005' },
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

  // ── Settlement ────────────────────────────────────────────────────
  const existing = await prisma.settlement.findUnique({ where: { reference: 'STLMT-SEED-001' } });
  if (!existing) {
    await prisma.settlement.create({
      data: {
        id: uuidv4(),
        amount: 8_200_000,
        status: 'COMPLETED',
        reference: 'STLMT-SEED-001',
        merchantId: merchant.id,
      },
    });
  }

  return { success: true, message: 'Demo data seeded successfully' };
}