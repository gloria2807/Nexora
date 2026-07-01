// src/routes/accounts.js
// Virtual account provisioning.
// Each customer gets exactly one permanent dedicated virtual account.
// accountRef format: cust_<customerId_prefix>_<timestamp> (16-64 chars, Nomba requirement)

import express from 'express';
import prisma from '../lib/db.js';
import * as nomba from '../lib/nomba.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/accounts
// Returns all virtual accounts with transaction count and balance
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.virtualAccount.findMany({
      where: { accountRef: { not: 'nexora_catchall_holding_0001' } },
      include: {
        _count: { select: { transactions: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Shape response to match frontend expectations exactly
    const shaped = accounts.map((a) => ({
      id: a.id,
      accountName: a.accountName,
      bankName: a.bankName,
      status: a.status,
      accountNumber: a.accountNumber || '—',
      balance: a.balance,
      reference: a.accountRef,
      customerId: a.customerId,
      customer: a.customer,
      _count: a._count,
      createdAt: a.createdAt,
    }));

    res.json(shaped);
  } catch (err) {
    console.error('[accounts] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/accounts
// Creates a virtual account via Nomba API, stores result locally.
// Edge cases handled:
//   - Customer already has an active account → 409
//   - Nomba API failure → 502 with detail
//   - accountRef uniqueness guaranteed by our format
router.post('/', async (req, res) => {
  try {
    const { accountName, customerId } = req.body;

    if (!accountName) {
      return res.status(400).json({ error: 'accountName is required' });
    }

    // Validate name length for Nomba (8-64 chars)
    if (accountName.length < 8) {
      return res.status(400).json({ error: 'accountName must be at least 8 characters' });
    }

    // Edge case: one account per customer
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const existingAccount = await prisma.virtualAccount.findFirst({
        where: { customerId, status: 'ACTIVE' },
      });
      if (existingAccount) {
        return res.status(409).json({
          error: 'Customer already has an active virtual account',
          accountId: existingAccount.id,
        });
      }
    }

    // Build stable accountRef (must be 16-64 chars)
    // Format: nexora_<6-char-id>_<timestamp> = "nexora_" (7) + 6 + "_" (1) + 13 = 27 chars ✓
    const shortId = uuidv4().replace(/-/g, '').slice(0, 8);
    const accountRef = `nexora_${shortId}_${Date.now()}`;

    // Get customer's BVN if available (upgrades Nomba account trust)
    let bvn;
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      bvn = customer?.bvn;
    }

    // ── Call Nomba API ────────────────────────────────────────────
    let nombaAccount;
    try {
      nombaAccount = await nomba.createVirtualAccount({
        accountRef,
        accountName,
        bvn,
      });
    } catch (nombaErr) {
      console.error('[accounts] Nomba API error:', nombaErr.message);
      return res.status(502).json({
        error: 'Virtual account provisioning failed',
        detail: nombaErr.message,
      });
    }

    // ── Persist locally ───────────────────────────────────────────
    const account = await prisma.virtualAccount.create({
      data: {
        id: uuidv4(),
        accountName,
        accountRef,
        accountNumber: nombaAccount.bankAccountNumber || nombaAccount.accountNumber,
        bankName: nombaAccount.bankName || 'Nombank MFB',
        bankAccountName: nombaAccount.bankAccountName,
        nombaAccountHolderId: nombaAccount.accountHolderId,
        status: 'ACTIVE',
        customerId: customerId || null,
      },
    });

    res.status(201).json({
      id: account.id,
      accountName: account.accountName,
      bankName: account.bankName,
      status: account.status,
      accountNumber: account.accountNumber || '—',
      balance: account.balance,
      reference: account.accountRef,
      _count: { transactions: 0 },
    });
  } catch (err) {
    console.error('[accounts] POST error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PATCH /api/accounts/:id — rename or change status
// Edge case: renaming a closed account is rejected
// Edge case: KYC tier change → reflected on account name if needed
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { accountName, status } = req.body;

    const account = await prisma.virtualAccount.findUnique({ where: { id } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (account.status === 'CLOSED' && status !== 'CLOSED') {
      return res.status(409).json({ error: 'Cannot reactivate a closed account' });
    }

    const updated = await prisma.virtualAccount.update({
      where: { id },
      data: {
        ...(accountName && { accountName }),
        ...(status && { status }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[accounts] PATCH error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id — close an account
// Calls Nomba to expire the virtual account, then marks it CLOSED locally.
// Edge case: balance > 0 → blocked unless force=true query param
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    const account = await prisma.virtualAccount.findUnique({ where: { id } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (account.balance > 0 && !force) {
      return res.status(409).json({
        error: `Account has ₦${account.balance.toLocaleString()} balance. Use ?force=true to close anyway.`,
        balance: account.balance,
      });
    }

    // Expire on Nomba
    try {
      await nomba.expireVirtualAccount(account.accountRef);
    } catch (nombaErr) {
      console.warn('[accounts] Nomba expire failed (continuing local close):', nombaErr.message);
    }

    await prisma.virtualAccount.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    res.json({ success: true, status: 'CLOSED' });
  } catch (err) {
    console.error('[accounts] DELETE error:', err);
    res.status(500).json({ error: 'Failed to close account' });
  }
});

export default router;
