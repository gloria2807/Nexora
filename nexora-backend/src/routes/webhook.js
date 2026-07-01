// src/routes/webhook.js
// Nomba webhook endpoint.
// SECURITY: raw body must be parsed before signature verification — express.raw() is applied here.
// IDEMPOTENCY: every event is checked against WebhookEvent.requestId before processing.

import express from 'express';
import { verifyNombaSignature } from '../middleware/webhookAuth.js';
import { reconcileInboundTransfer } from '../services/reconciliation.js';
import prisma from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// express.raw() captures the body as Buffer for HMAC verification
router.post(
  '/webhooks/nomba',
  express.raw({ type: 'application/json' }),
  verifyNombaSignature,
  async (req, res) => {
    // ACK immediately — Nomba retries if we don't respond within ~30 seconds
    res.sendStatus(200);

    const event = req.webhookBody;
    const requestId = event?.requestId;

    if (!requestId) {
      console.warn('[webhook] Event missing requestId — cannot guarantee idempotency');
      return;
    }

    // ── Idempotency: skip if already logged ─────────────────────────
    const existing = await prisma.webhookEvent.findUnique({ where: { requestId } });
    if (existing?.processed) {
      console.log(`[webhook] Already processed requestId=${requestId} — skipping`);
      return;
    }

    // ── Log raw event ────────────────────────────────────────────────
    const webhookRecord = await prisma.webhookEvent.upsert({
      where: { requestId },
      update: {},
      create: {
        id: uuidv4(),
        requestId,
        event: event.event || 'unknown',
        payload: JSON.stringify(event),
        signature: req.headers['x-nomba-signature'] || req.headers['nomba-signature'] || '',
      },
    });

    // ── Route by event type ──────────────────────────────────────────
    try {
      switch (event.event) {
        case 'virtual_account.funded':
        case 'virtualaccount.credit': {
          // Nomba may use either event name depending on dashboard config
          const data = event.data || {};

          // Nomba sends amounts in kobo for some events — normalise to Naira
          // The virtual account creation uses Naira in expectedAmount,
          // but webhook data.amount may come in kobo. Check and convert.
          const rawAmount = data.amount || 0;
          // If amount > 100,000 it's almost certainly kobo (₦1000 = 100000 kobo)
          // Safe heuristic: if amount > 1_000_000 treat as kobo
          const amount = rawAmount > 1_000_000 ? rawAmount / 100 : rawAmount;

          await reconcileInboundTransfer({
            accountRef: data.accountRef || data.account_ref,
            amount,
            senderName: data.senderName || data.sender_name || data.customerName,
            senderAccount: data.senderAccount || data.sender_account,
            narration: data.narration || data.description,
            nombaRequestId: requestId,
            nombaSessionId: data.sessionId || data.session_id,
          });
          break;
        }

        case 'transfer.success':
        case 'payment_success': {
          // Update MerchantService status if reference matches
          const ref = event.data?.merchantTxRef;
          if (ref) {
            await prisma.merchantService.updateMany({
              where: { reference: ref },
              data: { status: 'SUCCESS', nombaRef: event.data?.id },
            });
          }
          break;
        }

        case 'transfer.failed': {
          const ref = event.data?.merchantTxRef;
          if (ref) {
            await prisma.merchantService.updateMany({
              where: { reference: ref },
              data: { status: 'FAILED' },
            });
          }
          break;
        }

        default:
          console.log(`[webhook] Unhandled event type: ${event.event}`);
      }

      // Mark as processed
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processed: true, processedAt: new Date() },
      });

    } catch (err) {
      console.error(`[webhook] Processing error for requestId=${requestId}:`, err.message);

      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { error: err.message },
      });
    }
  }
);

export default router;
