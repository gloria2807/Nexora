// src/routes/customers.js

import express from 'express';
import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (err) {
    console.error('[customers] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// POST /api/customers
// Edge case: if BVN provided → kycTier 2, else tier 1
// Edge case: duplicate email returns 409 with clear message
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, bvn } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }

    // Duplicate email check
    const exists = await prisma.customer.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'A customer with this email already exists' });
    }

    const customer = await prisma.customer.create({
      data: {
        id: uuidv4(),
        firstName,
        lastName,
        email,
        phone,
        bvn: bvn || null,
        kycTier: bvn ? 2 : 1,
      },
    });

    res.status(201).json(customer);
  } catch (err) {
    console.error('[customers] POST error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id — KYC upgrade (BVN addition triggers tier change)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bvn, firstName, lastName, phone } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const update = {};
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;
    if (phone) update.phone = phone;
    if (bvn && !existing.bvn) {
      update.bvn = bvn;
      update.kycTier = 2;
    }

    const customer = await prisma.customer.update({ where: { id }, data: update });
    res.json(customer);
  } catch (err) {
    console.error('[customers] PATCH error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

export default router;
