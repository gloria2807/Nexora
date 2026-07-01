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
  me: () => request('GET', '/api/me'),
  getDocs: () => request('GET', '/api/docs'),
  seedData: () => request('POST', '/api/seed'),
  getCustomers: () => request('GET', '/api/customers'),
  createCustomer: (data) => request('POST', '/api/customers', data),
  updateCustomer: (id, data) => request('PATCH', `/api/customers/${id}`, data),
  getAccounts: () => request('GET', '/api/accounts'),
  createAccount: (data) => request('POST', '/api/accounts', data),
  updateAccount: (id, data) => request('PATCH', `/api/accounts/${id}`, data),
  closeAccount: (id, force = false) =>
    request('DELETE', `/api/accounts/${id}${force ? '?force=true' : ''}`),
  getInvoices: () => request('GET', '/api/invoices'),
  createInvoice: (data) => request('POST', '/api/invoices', data),
  getTransactions: () => request('GET', '/api/transactions'),
  simulateTransfer: (data) => request('POST', '/api/simulate', data),
  getExceptions: () => request('GET', '/api/exceptions'),
  resolveException: (id) => request('POST', `/api/exceptions/${id}/resolve`),
  getReconciliationReport: () => request('GET', '/api/reconciliation/report'),
  getStatements: (accountId) => request('GET', `/api/statements/${accountId}`),
  getMerchantBalance: () => request('GET', '/api/merchant/balance'),
  getSettlements: () => request('GET', '/api/merchant/settlements'),
  getServices: () => request('GET', '/api/services'),
  getPendingApprovals: () => request('GET', '/api/services/approvals'),
  payService: (data) => request('POST', '/api/services/pay', data),
  approveService: (id) => request('POST', `/api/services/${id}/approve`),
  rejectService: (id) => request('POST', `/api/services/${id}/reject`),
};
