# Nexora Backend

**Dedicated Virtual Account & Reconciliation Engine — Nomba x DevCareer Hackathon 2026**

Provisions customer-named NUBANs via Nomba, receives inbound bank transfers via webhook, and automatically reconciles them into structured sales records with zero manual work.

---

## Quick Start

```bash
# 1. Clone and install
cd nexora-backend
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Nomba sandbox credentials

# 3. Set up database
npx prisma db push

# 4. Start server
npm run dev

# 5. Seed demo data (visit in browser or POST)
curl -X POST http://localhost:3000/api/seed
```

The server starts on **http://localhost:3000**.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path: `file:./prisma/dev.db` |
| `NOMBA_BASE_URL` | `https://sandbox.nomba.com` for hackathon |
| `NOMBA_ACCOUNT_ID` | Your parent account ID from Nomba dashboard |
| `NOMBA_CLIENT_ID` | OAuth client ID |
| `NOMBA_CLIENT_SECRET` | OAuth client secret — never commit this |
| `NOMBA_WEBHOOK_SECRET` | Must match what you set in Nomba dashboard |
| `FRONTEND_URL` | CORS origin, e.g. `http://localhost:5173` |

---

## Architecture

```
Frontend (React + Vite)
        │
        ▼
Express REST API (/api/*)
        │
        ├── Customers        → create/list/update
        ├── Accounts         → virtual account provisioning via Nomba
        ├── Invoices         → create/list/track payment status
        ├── Transactions     → inbound transfers + simulate endpoint
        ├── Exceptions       → unmatched/overpaid/misdirected payments
        ├── Merchant         → balance, services hub, approvals, settlements
        ├── Statements       → per-account ledger (powers Statements page)
        ├── Meta             → /api/me, /api/docs, /api/seed
        └── Public API       → /api/public/v1/* (downstream integration)

Nomba Webhook (/webhooks/nomba)
        │
        ▼
Reconciliation Engine (src/services/reconciliation.js)
        │
        ├── Idempotency check (nombaRequestId unique index)
        ├── Virtual account lookup by accountRef
        ├── Account status check (ACTIVE/FROZEN/CLOSED edge cases)
        ├── FIFO invoice matching (oldest open invoice first)
        ├── Amount comparison with 2% overpayment tolerance
        ├── DB transaction: Transaction + LedgerEntry + Invoice update
        └── Exception creation for anything that can't auto-resolve
```

---

## API Routes

### Dashboard API (`/api/*`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/me` | Merchant profile + API key |
| GET | `/api/docs` | OpenAPI spec for Developers page |
| POST | `/api/seed` | Seed demo data for judges |
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Create customer (BVN → Tier 2) |
| PATCH | `/api/customers/:id` | Update / KYC upgrade |
| GET | `/api/accounts` | List virtual accounts |
| POST | `/api/accounts` | Provision via Nomba |
| PATCH | `/api/accounts/:id` | Rename / freeze |
| DELETE | `/api/accounts/:id` | Close (blocked if balance > 0) |
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/transactions` | All inbound transactions |
| POST | `/api/simulate` | Simulate webhook for demo |
| GET | `/api/exceptions` | Unmatched/problem payments |
| POST | `/api/exceptions/:id/resolve` | Manual resolution |
| GET | `/api/reconciliation/report` | Efficiency metrics |
| GET | `/api/statements/:accountId` | Ledger entries |
| GET | `/api/merchant/balance` | Live Nomba balance |
| GET | `/api/merchant/settlements` | Settlement history |
| GET | `/api/services` | Outgoing payment history |
| GET | `/api/services/approvals` | Pending approvals (>₦500k) |
| POST | `/api/services/pay` | Airtime/data/bills/transfer |
| POST | `/api/services/:id/approve` | Approve queued payment |
| POST | `/api/services/:id/reject` | Reject queued payment |

### Webhook

| Method | Path | Description |
|---|---|---|
| POST | `/webhooks/nomba` | Nomba events receiver |

### Public Developer API (`/api/public/v1/*`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/public/v1/virtual-accounts` | Provision account |
| GET | `/api/public/v1/virtual-accounts` | List accounts |
| GET | `/api/public/v1/virtual-accounts/:ref` | Fetch account |
| GET | `/api/public/v1/statements/:ref` | Account statement |
| GET | `/api/public/v1/reconciliation/report` | Metrics |
| GET | `/api/public/v1/exceptions` | Exception list |
| POST | `/api/public/v1/exceptions/:id/resolve` | Resolve exception |
| POST | `/api/public/v1/transfers` | Outbound transfer |

---

## Edge Cases Handled

### Account lifecycle
- **One account per customer** — `POST /api/accounts` returns 409 if customer already has an ACTIVE account
- **Closed accounts still receive money** — bank rails ignore closure; we catch these as `MISDIRECTED` exceptions
- **Frozen account payments** — flagged as exceptions, not silently dropped
- **Cannot reactivate CLOSED accounts** — 409 with clear message
- **Balance > 0 on close** — blocked unless `?force=true`

### Reconciliation
- **Idempotency** — every webhook event is checked against `nombaRequestId` before processing; duplicate delivery does nothing
- **FIFO matching** — oldest open invoice matched first; partial payments accumulate
- **Overpayment tolerance** — 2% tolerance before flagging an exception (handles rounding on bank rails)
- **Significant overpayment** — flagged as `OVERPAYMENT` exception but invoice still marked PAID
- **No open invoice** — flagged as `UNMATCHED` exception; payment credited to account balance
- **Unknown accountRef** — payment routed to catch-all holding account and flagged as `MISDIRECTED`

### Security
- Webhook HMAC-SHA256 verification via `crypto.timingSafeEqual` (prevents timing attacks)
- `clientSecret` and `webhookSecret` loaded from environment only — never in source
- Public API requires Bearer API key; each key scoped to one merchant
- All Nomba tokens cached in memory and refreshed at 55-minute mark (never one token per call)

### Payments
- **Approval queue** — any service payment ≥ ₦500,000 requires manual approval before execution
- **Bank transfer** — always calls `/transfers/bank/lookup` before sending funds
- **Unique `merchantTxRef`** per attempt — prevents double-charges on retry

---

## Frontend Integration

Drop `src/lib/api.client.js` into your frontend as `src/lib/api.js`. It exports the `api` object that all components import.

```bash
# In your frontend project:
cp ../nexora-backend/src/lib/api.client.js src/lib/api.js
```

Set in your frontend `.env`:
```
VITE_API_URL=http://localhost:3000
```

---

## Nomba Webhook Setup

1. In the Nomba sandbox dashboard, go to **Settings → Webhooks**
2. Set URL to: `https://your-tunnel.ngrok.io/webhooks/nomba`
3. Set secret to match `NOMBA_WEBHOOK_SECRET` in your `.env`
4. Enable events: `virtual_account.funded`, `transfer.success`, `transfer.failed`

For local development, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
```

---

## Database

Uses **Prisma + SQLite** for the hackathon (zero setup). Swap to PostgreSQL for production by changing `DATABASE_URL` and the provider in `prisma/schema.prisma`.

```bash
# View data
npx prisma studio

# Reset everything
npx prisma db push --force-reset
# Then reseed: POST /api/seed
```
