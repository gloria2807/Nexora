// src/middleware/webhookAuth.js
// Verifies Nomba HMAC-SHA256 webhook signature.
// Must be applied BEFORE express.json() on the webhook route — we need raw bytes.

import crypto from 'crypto';

export function verifyNombaSignature(req, res, next) {
  const signature = req.headers['x-nomba-signature'] || req.headers['nomba-signature'];

  if (!signature) {
    console.warn('[webhook] Missing signature header — rejecting');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const secret = process.env.NOMBA_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] NOMBA_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // req.body is raw Buffer (express.raw middleware applied on this route)
  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  // Constant-time compare prevents timing attacks
  const sigBuffer = Buffer.from(signature, 'hex');
  const expBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    console.warn('[webhook] Signature mismatch — rejecting');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Parse body now that it's verified
  try {
    req.webhookBody = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  next();
}

// ── Internal API key auth for the public developer API ───────────
export function requireApiKey(req, res, next) {
  const key = req.headers['authorization']?.replace('Bearer ', '');
  if (!key) return res.status(401).json({ error: 'Missing Authorization header' });

  // In production this would check against a hashed key in DB
  // For hackathon, we check against the merchant's stored apiKey
  req.apiKey = key;
  next();
}
