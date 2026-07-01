// src/routes/transactions.js

import express from 'express';
import prisma from '../lib/db.js';
import { reconcileInboundTransfer, getReconciliationReport } from '../services/reconciliation.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/transactions
// Returns all inbound transactions with linked virtual account info
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        virtualAccount: {
          select: { accountName: true, accountNumber: true, accountRef: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // cap for performance
    });
    res.json(transactions);
  } catch (err) {
    console.error('[transactions] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/simulate
// Simulate an inbound transfer webhook for demo/testing.
// This fires the real reconciliation engine without a real Nomba event.
router.post('/simulate', async (req, res) => {
  try {
    const { accountReference, amount } = req.body;

    if (!accountReference || !amount) {
      return res.status(400).json({ error: 'accountReference and amount are required' });
    }
    if (amount < 1) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    // Verify account exists
    const account = await prisma.virtualAccount.findUnique({
      where: { accountRef: accountReference },
    });
    if (!account) {
      return res.status(404).json({ error: 'No virtual account found with this reference' });
    }

    // Generate a unique fake requestId so idempotency works correctly
    const fakeRequestId = `sim_${uuidv4()}`;

    const result = await reconcileInboundTransfer({
      accountRef: accountReference,
      amount: parseFloat(amount),
      senderName: 'Test Sender',
      senderAccount: '0000000000',
      narration: 'Simulated test transfer',
      nombaRequestId: fakeRequestId,
      nombaSessionId: `sim_session_${Date.now()}`,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[simulate] error:', err);
    res.status(500).json({ error: err.message || 'Simulation failed' });
  }
});

// GET /api/exceptions
// Returns unresolved exceptions for the UnmatchedPayments page
// Shape expected: { id, reference, amount, date, sender, days, resolved }
router.get('/exceptions', async (req, res) => {
  try {
    const exceptions = await prisma.exception.findMany({
      include: {
        transaction: {
          select: { reference: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const shaped = exceptions.map((e) => {
      const createdAt = new Date(e.createdAt);
      const days = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: e.id,
        reference: e.transaction?.reference || '—',
        amount: `₦${e.amount.toLocaleString()}`,
        date: e.createdAt,
        sender: e.senderName || 'Unknown',
        days,
        resolved: e.resolved,
        type: e.type,
        reason: e.reason,
      };
    });

    res.json(shaped);
  } catch (err) {
    console.error('[exceptions] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
});

// POST /api/exceptions/:id/resolve
// Manually resolve an exception — marks it resolved and updates transaction status
router.post('/exceptions/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const exception = await prisma.exception.findUnique({
      where: { id },
      include: { transaction: true },
    });
    if (!exception) return res.status(404).json({ error: 'Exception not found' });
    if (exception.resolved) return res.status(409).json({ error: 'Already resolved' });

    await prisma.$transaction([
      prisma.exception.update({
        where: { id },
        data: { resolved: true, resolvedAt: new Date(), resolvedBy: 'manual' },
      }),
      prisma.transaction.update({
        where: { id: exception.transactionId },
        data: { status: 'RECONCILED', reconciledAt: new Date() },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('[exceptions] resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve exception' });
  }
});

// GET /api/reconciliation/report
router.get('/reconciliation/report', async (req, res) => {
  try {
    const report = await getReconciliationReport();
    res.json(report);
  } catch (err) {
    console.error('[report] error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/statements/:accountId
// Returns the ledger entries for a virtual account — powers the Statements page
router.get('/statements/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.virtualAccount.findUnique({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const entries = await prisma.ledgerEntry.findMany({
      where: { virtualAccountId: accountId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      account: {
        id: account.id,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        balance: account.balance,
      },
      statement: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        description: e.description,
        type: e.type,
        amount: e.amount,
        balanceAfter: e.balanceAfter,
      })),
    });
  } catch (err) {
    console.error('[statements] error:', err);
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

export default router;
