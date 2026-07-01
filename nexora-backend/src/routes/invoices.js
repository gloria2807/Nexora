// src/routes/invoices.js

import express from 'express';
import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    console.error('[invoices] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/invoices
// Creates invoice and optionally sets expectedAmount on the customer's virtual account
// so Nomba can soft-validate inbound transfers
router.post('/', async (req, res) => {
  try {
    const { customerId, amount, dueDate } = req.body;

    if (!customerId || !amount || !dueDate) {
      return res.status(400).json({ error: 'customerId, amount, and dueDate are required' });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const reference = `INV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        id: uuidv4(),
        reference,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        customerId,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error('[invoices] POST error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

export default router;
