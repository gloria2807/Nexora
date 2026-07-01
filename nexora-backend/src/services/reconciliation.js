// src/services/reconciliation.js
// The reconciliation engine.
// Called by the webhook handler every time a virtual_account.funded event arrives.
//
// Logic:
//   1. Find the virtual account by accountRef
//   2. Find the oldest open invoice for that customer (FIFO)
//   3. Determine match status: MATCHED | PARTIAL | UNMATCHED | OVERPAYMENT
//   4. Update invoice amountPaid and status
//   5. Write a LedgerEntry (running balance)
//   6. Raise an Exception record for anything that can't auto-resolve
//   7. Return result for the webhook handler to ACK Nomba

import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// 2% overpayment tolerance before we flag an exception
const OVERPAYMENT_TOLERANCE = 0.02;

/**
 * reconcileInboundTransfer
 * @param {object} params
 * @param {string} params.accountRef   - The accountRef on the virtual account
 * @param {number} params.amount       - Amount received (Naira, not kobo)
 * @param {string} params.senderName   - Sender name from Nomba webhook
 * @param {string} params.senderAccount - Sender account number
 * @param {string} params.narration    - Transfer narration
 * @param {string} params.nombaRequestId - Nomba requestId (idempotency key)
 * @param {string} params.nombaSessionId - Nomba sessionId (for requery)
 */
export async function reconcileInboundTransfer({
  accountRef,
  amount,
  senderName,
  senderAccount,
  narration,
  nombaRequestId,
  nombaSessionId,
}) {
  // ── 1. Idempotency check ────────────────────────────────────────
  // If we've already processed this nombaRequestId, skip entirely.
  const existingTx = await prisma.transaction.findUnique({
    where: { nombaRequestId },
  });
  if (existingTx) {
    console.log(`[reconcile] Duplicate webhook requestId=${nombaRequestId} — skipping`);
    return { skipped: true, transactionId: existingTx.id };
  }

  // ── 2. Find the virtual account ──────────────────────────────────
  const virtualAccount = await prisma.virtualAccount.findUnique({
    where: { accountRef },
    include: {
      customer: true,
    },
  });

  if (!virtualAccount) {
    console.error(`[reconcile] Virtual account not found for accountRef=${accountRef}`);
    // Still write a transaction so we have an audit trail
    const tx = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        reference: `TXN-${Date.now()}-MISDIRECTED`,
        nombaRequestId,
        nombaSessionId,
        amount,
        senderName,
        senderAccount,
        narration,
        status: 'UNMATCHED',
        // We cannot link virtualAccountId because we don't have it
        // Create a placeholder — in production, use a "catch-all" holding account
        virtualAccountId: await getOrCreateCatchAllAccount(),
      },
    });

    await prisma.exception.create({
      data: {
        id: uuidv4(),
        type: 'MISDIRECTED',
        reason: `No virtual account found for accountRef=${accountRef}`,
        amount,
        senderName,
        transactionId: tx.id,
      },
    });

    return { status: 'MISDIRECTED', transactionId: tx.id };
  }

  // ── 3. Check account status ──────────────────────────────────────
  // Edge case: closed/frozen accounts still receive money on bank rails
  if (virtualAccount.status !== 'ACTIVE') {
    const tx = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        reference: `TXN-${Date.now()}-FROZEN`,
        nombaRequestId,
        nombaSessionId,
        amount,
        senderName,
        senderAccount,
        narration,
        status: 'UNMATCHED',
        virtualAccountId: virtualAccount.id,
      },
    });

    await prisma.exception.create({
      data: {
        id: uuidv4(),
        type: 'MISDIRECTED',
        reason: `Payment received on ${virtualAccount.status} account. Manual review required.`,
        amount,
        senderName,
        transactionId: tx.id,
      },
    });

    return { status: 'FROZEN_ACCOUNT', transactionId: tx.id };
  }

  // ── 4. Find the best matching open invoice (FIFO) ───────────────
  const openInvoice = virtualAccount.customer
    ? await prisma.invoice.findFirst({
        where: {
          customerId: virtualAccount.customer.id,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { createdAt: 'asc' }, // FIFO
      })
    : null;

  // ── 5. Determine reconciliation status ──────────────────────────
  let txStatus = 'UNMATCHED';
  let invoiceId = null;
  let exceptionType = null;
  let exceptionReason = null;

  if (openInvoice) {
    const remaining = openInvoice.amount - openInvoice.amountPaid;
    const tolerance = openInvoice.amount * OVERPAYMENT_TOLERANCE;

    if (amount >= remaining - 0.01) {
      // Paid in full (or within rounding)
      const overpayment = amount - remaining;

      if (overpayment > tolerance) {
        // Significant overpayment — flag for review but still mark paid
        txStatus = 'MATCHED';
        exceptionType = 'OVERPAYMENT';
        exceptionReason = `Overpayment of ₦${overpayment.toLocaleString()} on invoice ${openInvoice.reference}`;
      } else {
        txStatus = 'MATCHED';
      }
      invoiceId = openInvoice.id;
    } else {
      // Partial payment
      txStatus = 'PARTIAL';
      invoiceId = openInvoice.id;
    }
  } else {
    // No open invoice — this is an unmatched/unexpected payment
    exceptionType = 'UNMATCHED';
    exceptionReason = `No open invoice found for customer. Payment of ₦${amount.toLocaleString()} received.`;
  }

  // ── 6. Write Transaction, update Invoice, update balance ─────────
  // Use a DB transaction so all-or-nothing
  const result = await prisma.$transaction(async (tx) => {

    // New balance after this credit
    const newBalance = virtualAccount.balance + amount;

    // Create the transaction record
    const transaction = await tx.transaction.create({
      data: {
        id: uuidv4(),
        reference: `TXN-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
        nombaRequestId,
        nombaSessionId,
        amount,
        senderName,
        senderAccount,
        narration,
        status: txStatus,
        virtualAccountId: virtualAccount.id,
        invoiceId,
        reconciledAt: ['MATCHED', 'PARTIAL'].includes(txStatus) ? new Date() : null,
      },
    });

    // Update virtual account balance
    await tx.virtualAccount.update({
      where: { id: virtualAccount.id },
      data: { balance: newBalance },
    });

    // Write a ledger entry for the statement
    await tx.ledgerEntry.create({
      data: {
        id: uuidv4(),
        type: 'CREDIT',
        amount,
        balanceAfter: newBalance,
        description: senderName
          ? `Transfer from ${senderName}${narration ? ` — ${narration}` : ''}`
          : `Inbound transfer${narration ? ` — ${narration}` : ''}`,
        virtualAccountId: virtualAccount.id,
        transactionId: transaction.id,
      },
    });

    // Update invoice if matched
    if (invoiceId) {
      const creditedAmount = openInvoice.amountPaid + amount;
      let newInvoiceStatus;

      if (creditedAmount >= openInvoice.amount - 0.01) {
        newInvoiceStatus = amount > openInvoice.amount * (1 + OVERPAYMENT_TOLERANCE)
          ? 'OVERPAID'
          : 'PAID';
      } else {
        newInvoiceStatus = 'PARTIAL';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: creditedAmount,
          status: newInvoiceStatus,
        },
      });
    }

    // Raise exception if needed
    if (exceptionType) {
      await tx.exception.create({
        data: {
          id: uuidv4(),
          type: exceptionType,
          reason: exceptionReason,
          amount,
          senderName,
          transactionId: transaction.id,
        },
      });
    }

    return { transaction, newBalance };
  });

  console.log(`[reconcile] Processed txn=${result.transaction.reference} status=${txStatus} amount=₦${amount}`);

  return {
    status: txStatus,
    transactionId: result.transaction.id,
    reference: result.transaction.reference,
    newBalance: result.newBalance,
    invoiceId,
    exceptionRaised: !!exceptionType,
  };
}

// ── Reconciliation Report ────────────────────────────────────────

export async function getReconciliationReport() {
  const [all, matched, unmatched] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({
      where: { status: { in: ['MATCHED', 'RECONCILED'] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { status: 'UNMATCHED' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalProcessed = all._count;
  const reconciledCount = matched._count;
  const unreconciledCount = unmatched._count;
  const totalAmount = all._sum.amount || 0;
  const reconciledAmount = matched._sum.amount || 0;
  const unreconciledAmount = unmatched._sum.amount || 0;

  const collectionEfficiency =
    totalProcessed > 0 ? (reconciledCount / totalProcessed) * 100 : 0;

  return {
    collectionEfficiency,
    totalProcessed,
    reconciledCount,
    unreconciledCount,
    totalAmount,
    reconciledAmount,
    unreconciledAmount,
  };
}

// ── Helper: catch-all account for truly misdirected payments ─────
async function getOrCreateCatchAllAccount() {
  const existing = await prisma.virtualAccount.findUnique({
    where: { accountRef: 'nexora_catchall_holding_0001' },
  });
  if (existing) return existing.id;

  const created = await prisma.virtualAccount.create({
    data: {
      id: uuidv4(),
      accountName: 'NEXORA HOLDING — CATCH ALL',
      accountRef: 'nexora_catchall_holding_0001',
      status: 'ACTIVE',
      bankName: 'Internal',
    },
  });
  return created.id;
}
