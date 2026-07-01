// src/lib/nomba.js
// Nomba API client for sandbox.
// Caches the access token in memory and refreshes at the 55-minute mark.
// Never requests a fresh token per call.

import fetch from 'node-fetch';

const BASE_URL = process.env.NOMBA_BASE_URL || 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID;
const CLIENT_ID = process.env.NOMBA_CLIENT_ID;
const CLIENT_SECRET = process.env.NOMBA_CLIENT_SECRET;

// ── Token cache ──────────────────────────────────────────────────
let _token = null;
let _tokenExpiresAt = null; // epoch ms

async function getToken() {
  const now = Date.now();
  // Refresh if no token or within 5 minutes of expiry
  if (_token && _tokenExpiresAt && now < _tokenExpiresAt - 5 * 60 * 1000) {
    return _token;
  }

  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accountId': ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba auth failed: ${res.status} — ${err}`);
  }

  const { data } = await res.json();

  _token = data.access_token;
  // expiresAt is ISO string from Nomba
  _tokenExpiresAt = new Date(data.expiresAt).getTime();

  console.log(`[nomba] Token refreshed. Expires at ${data.expiresAt}`);
  return _token;
}

// ── Base request helper ──────────────────────────────────────────
async function request(method, path, body = null) {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'accountId': ACCOUNT_ID,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok || (json.code && json.code !== '00')) {
    const msg = json.description || json.message || res.statusText;
    throw new Error(`Nomba API error [${res.status}]: ${msg}`);
  }

  return json.data ?? json;
}

// ── Virtual Accounts ─────────────────────────────────────────────

/**
 * Create a virtual account on the parent Nomba account.
 * accountRef must be 16-64 chars.
 */
export async function createVirtualAccount({ accountRef, accountName, bvn, expectedAmount, expiryDate }) {
  const body = { accountRef, accountName };
  if (bvn) body.bvn = bvn;
  if (expectedAmount) body.expectedAmount = expectedAmount;
  if (expiryDate) body.expiryDate = expiryDate;

  return request('POST', '/v1/accounts/virtual', body);
}

/**
 * Create a virtual account under a specific sub-account.
 * Funds collected go directly into the sub-account balance.
 */
export async function createVirtualAccountForSubAccount(subAccountId, payload) {
  const body = { accountRef: payload.accountRef, accountName: payload.accountName };
  if (payload.bvn) body.bvn = payload.bvn;
  if (payload.expectedAmount) body.expectedAmount = payload.expectedAmount;

  return request('POST', `/v1/accounts/virtual/${subAccountId}`, body);
}

/**
 * Fetch a virtual account by accountRef or bankAccountNumber.
 */
export async function fetchVirtualAccount(identifier) {
  return request('GET', `/v1/accounts/virtual/${identifier}`);
}

/**
 * Expire (close) a virtual account permanently.
 */
export async function expireVirtualAccount(identifier) {
  return request('DELETE', `/v1/accounts/virtual/${identifier}`);
}

// ── Transactions & Requery ───────────────────────────────────────

/**
 * Requery a transaction by sessionId from Nomba.
 * Note: Nomba requery key is sessionId, not merchantTxRef.
 */
export async function requeryTransaction(sessionId) {
  return request('GET', `/v1/transactions/requery/${sessionId}`);
}

/**
 * Fetch parent account transactions with optional filters.
 */
export async function fetchTransactions({ dateFrom, dateTo, status } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (status) params.set('status', status);

  const qs = params.toString() ? `?${params}` : '';
  return request('GET', `/v1/transactions${qs}`);
}

// ── Transfers ────────────────────────────────────────────────────

/**
 * Resolve bank account number to name before sending funds.
 * Always call this before performBankTransfer.
 */
export async function bankAccountLookup({ bankCode, accountNumber }) {
  return request('POST', '/v1/transfers/bank/lookup', { bankCode, accountNumber });
}

/**
 * Perform bank transfer from parent account.
 * merchantTxRef must be unique per attempt.
 */
export async function performBankTransfer({ amount, bankCode, accountNumber, accountName, senderName, narration, merchantTxRef }) {
  return request('POST', '/v1/transfers/bank', {
    amount,
    bankCode,
    accountNumber,
    accountName,
    senderName,
    narration,
    merchantTxRef,
  });
}

/**
 * Fetch all supported bank codes and names.
 */
export async function fetchBankCodes() {
  return request('GET', '/v1/transfers/banks');
}

// ── Airtime & Data ───────────────────────────────────────────────

export async function purchaseAirtime({ phone, amount, merchantTxRef }) {
  return request('POST', '/v1/bills/airtime', { phone, amount, merchantTxRef });
}

export async function purchaseData({ phone, planCode, merchantTxRef }) {
  return request('POST', '/v1/bills/data', { phone, planCode, merchantTxRef });
}

// ── Bills ────────────────────────────────────────────────────────

export async function payElectricity({ meterNumber, providerId, amount, merchantTxRef }) {
  return request('POST', '/v1/bills/electricity', { meterNumber, providerId, amount, merchantTxRef });
}

export async function payCableTV({ smartCardNumber, providerId, merchantTxRef }) {
  return request('POST', '/v1/bills/cabletv', { smartCardNumber, providerId, merchantTxRef });
}

export async function payBetting({ customerId, providerId, amount, merchantTxRef }) {
  return request('POST', '/v1/bills/betting', { customerId, providerId, amount, merchantTxRef });
}

// ── Parent Account Balance ───────────────────────────────────────

export async function fetchParentAccountBalance() {
  return request('GET', '/v1/accounts/balance');
}
