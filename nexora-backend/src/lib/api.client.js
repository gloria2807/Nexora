// src/lib/api.js
// Drop this file into your frontend at src/lib/api.js
// Every function maps exactly to what the backend exposes.
// All components import { api } from '../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed: ${res.status}`);
  }

  return json;
}

export const api = {
  // ── Meta ──────────────────────────────────────────────────────
  me: () => request('GET', '/api/me'),
  getDocs: () => request('GET', '/api/docs'),
  seedData: () => request('POST', '/api/seed'),

  // ── Customers ─────────────────────────────────────────────────
  getCustomers: () => request('GET', '/api/customers'),
  createCustomer: (data) => request('POST', '/api/customers', data),
  updateCustomer: (id, data) => request('PATCH', `/api/customers/${id}`, data),

  // ── Virtual Accounts ──────────────────────────────────────────
  getAccounts: () => request('GET', '/api/accounts'),
  createAccount: (data) => request('POST', '/api/accounts', data),
  updateAccount: (id, data) => request('PATCH', `/api/accounts/${id}`, data),
  closeAccount: (id, force = false) =>
    request('DELETE', `/api/accounts/${id}${force ? '?force=true' : ''}`),

  // ── Invoices ──────────────────────────────────────────────────
  getInvoices: () => request('GET', '/api/invoices'),
  createInvoice: (data) => request('POST', '/api/invoices', data),

  // ── Transactions ──────────────────────────────────────────────
  getTransactions: () => request('GET', '/api/transactions'),
  simulateTransfer: (data) => request('POST', '/api/simulate', data),

  // ── Exceptions & Reconciliation ───────────────────────────────
  getExceptions: () => request('GET', '/api/exceptions'),
  resolveException: (id) => request('POST', `/api/exceptions/${id}/resolve`),
  getReconciliationReport: () => request('GET', '/api/reconciliation/report'),

  // ── Statements ────────────────────────────────────────────────
  getStatements: (accountId) => request('GET', `/api/statements/${accountId}`),

  // ── Merchant ──────────────────────────────────────────────────
  getMerchantBalance: () => request('GET', '/api/merchant/balance'),
  getSettlements: () => request('GET', '/api/merchant/settlements'),

  // ── Services (outgoing payments) ──────────────────────────────
  getServices: () => request('GET', '/api/services'),
  getPendingApprovals: () => request('GET', '/api/services/approvals'),
  payService: (data) => request('POST', '/api/services/pay', data),
  approveService: (id) => request('POST', `/api/services/${id}/approve`),
  rejectService: (id) => request('POST', `/api/services/${id}/reject`),
};
