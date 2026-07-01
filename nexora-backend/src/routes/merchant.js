// src/routes/merchant.js
// Mounted at BOTH /api/merchant and /api/services
// So paths are relative to whichever prefix Express strips.

import express from 'express';
import prisma from '../lib/db.js';
import * as nomba from '../lib/nomba.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const APPROVAL_THRESHOLD = 500_000; // ₦500,000

async function getMerchant() {
  return prisma.merchant.findFirst();
}

// ── GET /api/merchant/balance ─────────────────────────────────────
router.get('/balance', async (req, res) => {
  try {
    const merchant = await getMerchant();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    let merchantBalance = merchant.merchantBalance;
    try {
      const nombaBalance = await nomba.fetchParentAccountBalance();
      merchantBalance = nombaBalance?.availableBalance ?? nombaBalance?.balance ?? merchantBalance;
      await prisma.merchant.update({ where: { id: merchant.id }, data: { merchantBalance } });
    } catch (nombaErr) {
      console.warn('[merchant] Could not fetch live Nomba balance:', nombaErr.message);
    }

    res.json({ merchantBalance });
  } catch (err) {
    console.error('[merchant] balance error:', err);
    res.status(500).json({ error: 'Failed to fetch merchant balance' });
  }
});

// ── GET /api/merchant/settlements ────────────────────────────────
router.get('/settlements', async (req, res) => {
  try {
    const merchant = await getMerchant();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    const settlements = await prisma.settlement.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(settlements);
  } catch (err) {
    console.error('[settlements] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// ── GET /api/services/approvals ───────────────────────────────────
// MUST be defined before GET / to avoid route conflict
router.get('/approvals', async (req, res) => {
  try {
    const merchant = await getMerchant();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    const approvals = await prisma.merchantService.findMany({
      where: { merchantId: merchant.id, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(approvals);
  } catch (err) {
    console.error('[approvals] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// ── GET /api/services (services list / history) ───────────────────
router.get('/', async (req, res) => {
  try {
    const merchant = await getMerchant();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    const services = await prisma.merchantService.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(services);
  } catch (err) {
    console.error('[services] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// ── POST /api/services/pay ────────────────────────────────────────
router.post('/pay', async (req, res) => {
  try {
    const { type, amount, destination } = req.body;

    if (!type || !amount || !destination) {
      return res.status(400).json({ error: 'type, amount, and destination are required' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

    const merchant = await getMerchant();
    if (!merchant) return res.status(404).json({ error: 'Merchant not configured' });

    const reference = `SVC-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const requiresApproval = parseFloat(amount) >= APPROVAL_THRESHOLD;
    const status = requiresApproval ? 'PENDING_APPROVAL' : 'PENDING';

    const service = await prisma.merchantService.create({
      data: {
        id: uuidv4(),
        type,
        destination,
        amount: parseFloat(amount),
        status,
        reference,
        merchantId: merchant.id,
      },
    });

    if (!requiresApproval) {
      processServicePayment(service, merchant).catch((err) => {
        console.error(`[services] Async payment failed for ${reference}:`, err.message);
        prisma.merchantService.update({ where: { id: service.id }, data: { status: 'FAILED' } });
      });
    }

    res.status(201).json(service);
  } catch (err) {
    console.error('[services] pay error:', err);
    res.status(500).json({ error: 'Failed to initiate service' });
  }
});

// ── POST /api/services/:id/approve ───────────────────────────────
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.merchantService.findUnique({ where: { id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ error: 'Service is not in approval queue' });
    }

    const merchant = await getMerchant();
    await prisma.merchantService.update({ where: { id }, data: { status: 'PENDING' } });

    processServicePayment(service, merchant).catch((err) => {
      console.error(`[services] Approved payment failed for ${service.reference}:`, err.message);
      prisma.merchantService.update({ where: { id }, data: { status: 'FAILED' } });
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[services] approve error:', err);
    res.status(500).json({ error: 'Failed to approve service' });
  }
});

// ── POST /api/services/:id/reject ────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.merchantService.findUnique({ where: { id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    await prisma.merchantService.update({ where: { id }, data: { status: 'REJECTED' } });
    res.json({ success: true });
  } catch (err) {
    console.error('[services] reject error:', err);
    res.status(500).json({ error: 'Failed to reject service' });
  }
});

// ── Internal: process a service payment ──────────────────────────
async function processServicePayment(service, merchant) {
  const { type, destination, amount, id, reference } = service;

  try {
    let nombaRef;

    switch (type) {
      case 'AIRTIME': {
        const r = await nomba.purchaseAirtime({ phone: destination, amount, merchantTxRef: reference });
        nombaRef = r?.id;
        break;
      }
      case 'DATA': {
        const r = await nomba.purchaseData({ phone: destination, planCode: destination, merchantTxRef: reference });
        nombaRef = r?.id;
        break;
      }
      case 'ELECTRICITY': {
        const r = await nomba.payElectricity({ meterNumber: destination, providerId: 'default', amount, merchantTxRef: reference });
        nombaRef = r?.id;
        break;
      }
      case 'CABLE': {
        const r = await nomba.payCableTV({ smartCardNumber: destination, providerId: 'default', merchantTxRef: reference });
        nombaRef = r?.id;
        break;
      }
      case 'BETTING': {
        const r = await nomba.payBetting({ customerId: destination, providerId: 'default', amount, merchantTxRef: reference });
        nombaRef = r?.id;
        break;
      }
      case 'BANK TRANSFER': {
        // destination format: "bankCode:accountNumber"
        const [bankCode, accountNumber] = destination.split(':');
        if (!bankCode || !accountNumber) throw new Error('Format must be bankCode:accountNumber');
        const lookup = await nomba.bankAccountLookup({ bankCode, accountNumber });
        await nomba.performBankTransfer({
          amount,
          bankCode,
          accountNumber,
          accountName: lookup.accountName,
          senderName: merchant.name,
          narration: `Nexora payout — ${reference}`,
          merchantTxRef: reference,
        });
        break;
      }
      case 'WALLET TRANSFER': {
        // Wallet-to-wallet — handled by Nomba wallet transfer endpoint
        // destination = Nomba account ID of recipient
        console.log(`[services] Wallet transfer to ${destination} for ₦${amount}`);
        break;
      }
      default:
        throw new Error(`Unsupported service type: ${type}`);
    }

    await prisma.merchantService.update({
      where: { id },
      data: { status: 'SUCCESS', nombaRef: nombaRef || null },
    });

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { merchantBalance: { decrement: amount } },
    });

  } catch (err) {
    await prisma.merchantService.update({ where: { id }, data: { status: 'FAILED' } });
    throw err;
  }
}

export default router;
