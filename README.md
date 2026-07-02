# Nexora

> **Nomba × DevCareer Hackathon 2026 · Dedicated Virtual Accounts Track**

---

## The Story That built this

Our mother runs a small textile business in Tejuosho Market, Lagos. She sells to about forty regular customers, shop owners, tailors, event planners, people she has known for years. She extends them credit. They pay her back in instalments, sometimes weekly, sometimes whenever the money comes. She knows all their voices on the phone. She knows their children's names.

What she does not know, at any given moment, is exactly who has paid and who hasn't.

Every morning she opens a notebook; a physical, paper notebook, and cross-references it against the text alerts on her MTN line. *"₦15,000 credited to your account."* From who? She has to call the customer. Sometimes they say it was them. Sometimes she calls the wrong person. Sometimes two people send money on the same day and she writes the credit against the wrong name. She has lost money this way, because the system gave her no better option.

Nomba put it plainly in a an article they published recently on X:

> *"The moment you cannot tell what your business actually earned last month, you are flying blind. You cannot know your real profit margin. You cannot plan for next month. You cannot tell an investor, a bank, or a tax authority anything meaningful about your numbers."*

That is our mother's life. That is the life of the provision store owner in Aba, the fabric merchant in Kano, the spare parts dealer in Onitsha, the agricultural produce buyer in Ibadan. Every one of them running a business on text message alerts, paper notebooks, and phone calls to ask *"was that transfer from you?"*

Nomba also said something else that stayed with us:

> *"The businesses that stay small are often not the ones with bad products or bad marketing. They are the ones that never built the systems that would have let them grow confidently."*

When we heard about this hackathon, we did not have to think for long about what to build.

We built the system for our mother, and for the millions of others just like her.

---

## What Nexora Does

Nexora is a **dedicated virtual account and automatic reconciliation engine** built on Nomba's infrastructure.

Every customer gets their own permanent NUBAN: a real Nigerian bank account number that belongs only to them, named after them. When they transfer money, it arrives with their name attached. The system immediately matches that payment against their open invoice, updates their balance, writes a ledger entry, and marks the invoice paid.

When something doesn't match; a payment that's too high, too low, or from someone unexpected, it surfaces in an exceptions queue for human review, not silently swallowed into a pool of unidentifiable credits.

When a customer wants to know what they owe or what they've paid, there's a statement ready to share.

This is what the structured business era looks like, not a spreadsheet that "was very organized in January and is now a crime scene."

---

## The Problem in Numbers

- Nigeria processes over **₦14 trillion** in NIP transfers monthly (NIBSS, 2024)
- Over **41 million** MSMEs operate in Nigeria (SMEDAN)
- The majority still reconcile collections **manually**, via bank alert SMS and paper records
- Failed or misdirected reconciliation directly causes **bad debt write-offs, customer disputes, and lost revenue**
- The average informal business owner spends **2–4 hours per day** on manual payment tracking
- From 2026, NRS requires **monthly tax filings**, impossible to do accurately without clean transaction records

The tools to fix this already exist. Nomba's virtual account infrastructure is precisely the primitive needed. What has been missing is a clean, well-engineered layer that takes that primitive and turns it into an operational system a business can actually run on.

Nexora is that layer.

---

## The Solution

Nexora delivers three things, in the exact order a business needs them:

**1. Identity-anchored collection accounts**
Each customer is provisioned a dedicated NUBAN through Nomba. The account number is theirs permanently, linked to their name, their KYC tier, and their full transaction history from day one. No more mystery alerts.

**2. Automatic reconciliation**
When a transfer arrives, the engine matches it to the customer's oldest outstanding invoice using FIFO logic. It handles exact payments, partial payments, overpayments within a 2% tolerance, and significant overpayments, each treated correctly and distinctly. No payment falls through the gap silently.

**3. A developer API that compounds value**
Everything Nexora does: provision accounts, reconcile payments, generate statements, handle exceptions, is exposed through a clean REST API with proper authentication, idempotency, and a live OpenAPI spec. Any downstream system, accounting tool, or business application can integrate in minutes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Nexora Frontend                          │
│               React 18 · Vite · TanStack Query               │
│                                                               │
│  Landing  Dashboard  Customers  Accounts  Invoices            │
│  Transactions  Reconciliation  Statements  Merchant Hub       │
│  Developer API  Settings                                      │
└─────────────────────────┬────────────────────────────────────┘
                          │  REST (fetch + React Query)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                      Nexora Backend                           │
│             Express 4 · Node.js ESM · Prisma 5               │
│                                                               │
│  /api/customers          Customer CRUD + KYC tier management  │
│  /api/accounts           Virtual account provisioning         │
│  /api/invoices           Invoice lifecycle                    │
│  /api/transactions       Inbound transfer log + simulation    │
│  /api/exceptions         Exception queue + resolution         │
│  /api/reconciliation     Report & live metrics                │
│  /api/statements/:id     Per-account running ledger           │
│  /api/merchant           Balance, services hub, settlements   │
│  /api/services           Outgoing payments & vending          │
│  /api/public/v1/*        External developer API (Bearer auth) │
│  /webhooks/nomba         Nomba event receiver                 │
└──────────────┬───────────────────────────┬───────────────────┘
               │                           │
               ▼                           ▼
   ┌──────────────────┐       ┌─────────────────────────┐
   │    Nomba API     │       │     SQLite (Prisma)      │
   │                  │       │                          │
   │  Virtual Accts   │       │  Merchant                │
   │  Webhooks        │       │  Customer                │
   │  Transactions    │       │  VirtualAccount          │
   │  Transfers       │       │  Invoice                 │
   │  Airtime/Bills   │       │  Transaction             │
   │  Balance         │       │  Exception               │
   └──────────────────┘       │  LedgerEntry             │
                              │  MerchantService         │
                              │  Settlement              │
                              │  WebhookEvent            │
                              └─────────────────────────┘
```

### The Reconciliation Engine

The reconciliation engine (`src/services/reconciliation.js`) is the heart of the system. It runs every time a `virtual_account.funded` webhook arrives from Nomba.

```
Nomba fires webhook
        │
        ▼
① Idempotency check
   └── nombaRequestId already processed? → skip silently (duplicate delivery)
        │
        ▼
② Find virtual account by accountRef
   └── Not found? → catch-all holding account + MISDIRECTED exception
        │
        ▼
③ Check account status
   └── FROZEN or CLOSED? → MISDIRECTED exception
       (bank rails accept money regardless of our status — we catch it here)
        │
        ▼
④ Find oldest open invoice for this customer (FIFO)
   └── None? → UNMATCHED exception
        │
        ▼
⑤ Compare amounts
   ├── Within 2% of invoice remaining → MATCHED (rounding tolerance)
   ├── Below invoice remaining        → PARTIAL
   └── Above 2% of invoice remaining → MATCHED + OVERPAYMENT exception
        │
        ▼
⑥ Atomic Prisma $transaction
   ├── Create Transaction record
   ├── Update VirtualAccount.balance
   ├── Write LedgerEntry (running balance for statement)
   ├── Update Invoice (amountPaid + status)
   └── Create Exception record if needed
        │
        ▼
⑦ 200 ACK already sent (before processing — Nomba never retries due to us)
```

---

## Database Models

| Model | Purpose |
|---|---|
| `Merchant` | Single-tenant record; holds Nomba account reference and live balance |
| `Customer` | End customer with KYC tier (1 = basic, 2 = BVN-linked) |
| `VirtualAccount` | Dedicated NUBAN per customer; stores Nomba's `accountRef` and account number |
| `Invoice` | Expected payment; reconciliation engine matches inbound transfers against open invoices |
| `Transaction` | Every inbound transfer that hits a virtual account |
| `Exception` | Raised when auto-reconciliation fails (UNMATCHED, OVERPAYMENT, UNDERPAYMENT, MISDIRECTED) |
| `LedgerEntry` | Running balance per account — powers the Statements page |
| `MerchantService` | Outgoing payments: airtime, data, bills, bank/wallet transfers |
| `Settlement` | Daily sweep records from merchant balance to primary account |
| `WebhookEvent` | Raw Nomba webhook log — enables replay, audit, and forensic investigation |

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 + Vite | UI and build tooling |
| React Router v6 | Client-side routing across 11 pages |
| TanStack Query v5 | Server state, caching, background refetch, optimistic updates |
| Tailwind CSS | Utility-first styling |
| Framer Motion (`motion/react`) | Animations on cards, modals, table rows, form panels |
| Sonner | Toast notifications for every action outcome |
| Lucide React | Icon system |
| date-fns | Date formatting across tables and statements |

### Backend

| Technology | Purpose |
|---|---|
| Node.js 18+ (ESM) | Runtime with native `--watch` in development |
| Express 4 | HTTP server and routing |
| Prisma 5 | ORM, migrations, type-safe queries |
| SQLite | Zero-setup database (one line change to swap to PostgreSQL) |
| node-fetch 3 | Nomba API client |
| uuid 10 | Idempotency keys and record IDs |
| crypto (built-in) | HMAC-SHA256 webhook signature verification |
| dotenv | Environment variable loading |

---

## Security & Reliability

Security was not an afterthought. Every control was built in from the first commit.

### Webhook Signature Verification

Every Nomba webhook is verified with HMAC-SHA256 before any payload data is touched. The raw request body, not the parsed JSON, is used for the digest, because JSON serialisation can change whitespace and break the comparison. The comparison itself uses `crypto.timingSafeEqual` to prevent timing-based attacks.

```javascript
// src/middleware/webhookAuth.js
const expected = crypto
  .createHmac('sha256', process.env.NOMBA_WEBHOOK_SECRET)
  .update(req.body)       // raw Buffer — before JSON.parse
  .digest('hex');

// timingSafeEqual prevents byte-by-byte timing attacks
if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
  return res.status(401).json({ error: 'Invalid webhook signature' });
}
```

### Idempotency on Every Inbound Event

Nomba's documentation states that webhooks may be delivered more than once. Every event is checked against a unique index on `nombaRequestId` before any processing begins. If it has already been handled, it is silently skipped. A customer can never be credited twice for the same transfer, regardless of how many times Nomba retries.

### Webhook Acknowledged Before Processing

The handler responds `200 OK` immediately after signature verification, before any database work happens. This prevents Nomba from timing out and retrying because our reconciliation took too long.

### Secrets Only in Environment Variables

`NOMBA_CLIENT_SECRET` and `NOMBA_WEBHOOK_SECRET` are loaded exclusively from environment variables at runtime. They do not appear in source code, committed `.env` files, or log output. The `.env.example` file contains only placeholder strings.

### Nomba Token Caching

OAuth2 access tokens are cached in memory and refreshed at the 55-minute mark (tokens expire at 60 minutes). A fresh token is never requested per API call — doing so wastes rate limit budget and adds 200–400ms to every operation.

```javascript
// src/lib/nomba.js — serve from cache if not near expiry
if (_token && _tokenExpiresAt && now < _tokenExpiresAt - 5 * 60 * 1000) {
  return _token;
}
```

### Atomic Database Writes

Every reconciliation event writes to four tables (Transaction, VirtualAccount, LedgerEntry, Invoice) inside a single Prisma `$transaction`. If any step fails, none of them commit. The ledger balance, invoice status, and transaction record always agree.

### Large Payment Approval Queue

Any outgoing payment of ₦500,000 or above is placed in a `PENDING_APPROVAL` queue rather than executed immediately. A human must approve or reject it from the Merchant Hub before a single naira moves.

### Bank Account Lookup Before Every Transfer

Outbound transfers always call Nomba's `/transfers/bank/lookup` first, confirm the resolved account name, and only then initiate the transfer. It is enforced structurally — the lookup result is required in the transfer payload.

### Catch-All Account for Misdirected Funds

If a webhook arrives for an `accountRef` that does not exist in our database, the transaction is not silently dropped. It is routed to a system-level catch-all holding account and flagged as MISDIRECTED, creating an auditable trail for every naira that arrives on the system.

### Raw Webhook Event Log

Every raw Nomba webhook payload is stored in the `WebhookEvent` table, with its signature, before processing begins. This enables replay if processing fails, audit during incidents, and forensic investigation during disputes.

### Public API Authentication

The developer API (`/api/public/v1/*`) requires a Bearer token on every request, checked against the merchant's stored API key. Invalid or missing keys return 401 immediately.

### Idempotent Account Provisioning

The public API accepts an `x-idempotency-key` header. If an account was already provisioned with the same key, the existing account is returned, no duplicate NUBANs are created on retry.

---

## Nomba API Integration

Nexora integrates with 15 distinct Nomba API endpoints across 6 product areas:

| Nomba Endpoint | How Nexora Uses It |
|---|---|
| `POST /v1/auth/token/issue` | OAuth2 client_credentials token; cached 55 min |
| `POST /v1/accounts/virtual` | Provision dedicated NUBAN for a customer |
| `POST /v1/accounts/virtual/:subAccountId` | Provision under a sub-account (marketplace variant) |
| `GET /v1/accounts/virtual/:ref` | Fetch virtual account details and status |
| `DELETE /v1/accounts/virtual/:ref` | Expire NUBAN when account is closed |
| `GET /v1/transactions/requery/:sessionId` | Requery transaction for reconciliation audit |
| `GET /v1/transactions` | Fetch parent account transaction history |
| `POST /v1/transfers/bank/lookup` | Resolve NUBAN to account name before transfer |
| `POST /v1/transfers/bank` | Execute outbound bank transfer |
| `GET /v1/accounts/balance` | Fetch live merchant balance |
| `POST /v1/bills/airtime` | Purchase airtime from merchant balance |
| `POST /v1/bills/data` | Purchase data bundle |
| `POST /v1/bills/electricity` | Pay electricity bill |
| `POST /v1/bills/cabletv` | Subscribe to cable TV |
| `POST /v1/bills/betting` | Top up betting account |
| Inbound `virtual_account.funded` | Triggers reconciliation engine |
| Inbound `transfer.success` | Updates outgoing service status |
| Inbound `transfer.failed` | Marks service as failed, balance not debited |

---

## Edge Cases That Were Handled

### Virtual Account Lifecycle

| Scenario | What Happens |
|---|---|
| Customer already has an ACTIVE account | HTTP 409 with existing account ID; UI shows a toast |
| Account name under 8 characters | HTTP 400 — Nomba minimum enforced before the API call is made |
| Closing account with non-zero balance | HTTP 409 unless `?force=true`; frontend shows balance amount and a consent checkbox; Close button stays disabled until ticked |
| Attempting to reactivate a CLOSED account | HTTP 409 — closure is permanent; UI removes all actions from closed cards |
| Renaming a closed account | Not permitted; kebab menu collapses to "Account is closed" |
| Payment on a FROZEN account | Bank rails do not enforce freezes. Engine catches it, creates MISDIRECTED exception. |
| Payment on a CLOSED account | Same — rails are unaware. Caught by engine, routed to catch-all, flagged MISDIRECTED. |
| Unknown accountRef in webhook | Catch-all holding account + MISDIRECTED exception with full sender details. |

### Reconciliation

| Scenario | What Happens |
|---|---|
| Exact payment | Invoice → PAID; Transaction → MATCHED |
| Partial payment | Invoice → PARTIAL; Transaction → PARTIAL; next payment continues matching same invoice |
| Overpayment within 2% | Treated as rounding; Invoice → PAID; no exception raised |
| Significant overpayment (>2%) | Invoice → PAID; Transaction → MATCHED; OVERPAYMENT exception raised for review |
| No open invoice for customer | Transaction → UNMATCHED; Exception created with full sender details |
| Duplicate Nomba webhook | `nombaRequestId` unique index — processing skipped; no DB write |
| Multiple payments same customer | FIFO — oldest invoice matched first; balance reduces across payments |
| DB write fails mid-reconciliation | Prisma `$transaction` rollback, all four tables stay consistent |

### KYC Tier Changes

| Scenario | What Happens |
|---|---|
| Customer created without BVN | kycTier = 1; amber "Tier 1 — Upgrade" badge |
| Customer created with BVN | kycTier = 2; emerald "Tier 2" badge with shield icon |
| BVN added to existing Tier 1 customer | PATCH call; kycTier bumps to 2 immediately; badge updates; cannot downgrade |
| Tier 1 badge clicked in UI | BVN upgrade modal opens; 11-digit client-side validation; button disabled until valid |

### Outgoing Payments

| Scenario | What Happens |
|---|---|
| Amount ≥ ₦500,000 | PENDING_APPROVAL status; appears in Merchant Hub approval queue; not executed until approved |
| Approval rejected | Status → REJECTED; balance untouched; record kept for audit |
| Bank transfer attempted without lookup | Not possible by design, lookup result is required by the transfer payload shape |
| Retry of same transfer | `merchantTxRef` unique per attempt; idempotent on Nomba's side |

---

## Running Locally

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- A Nomba sandbox account — [dashboard.nomba.com](https://dashboard.nomba.com)
- Two terminal windows

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/nexora.git
cd nexora
```

### Step 2 — Backend Setup

```bash
cd nexora-backend
npm install
cp .env.example .env
```

Edit `.env` with your Nomba sandbox credentials:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
NODE_ENV=development

NOMBA_BASE_URL=https://sandbox.nomba.com
NOMBA_ACCOUNT_ID=your_account_id_here
NOMBA_CLIENT_ID=your_client_id_here
NOMBA_CLIENT_SECRET=your_client_secret_here
NOMBA_WEBHOOK_SECRET=see dashboard [For the hackathon, it is: NombaHackathon2026]

FRONTEND_URL=http://localhost:5173
```

```bash
npx prisma db push
npm run dev
```

Expected output:

```
🚀 Nexora backend running on http://localhost:3000
   Health:     http://localhost:3000/health
   Webhooks:   http://localhost:3000/webhooks/nomba
   Public API: http://localhost:3000/api/public/v1
   Environment: development
```

### Step 3 — Frontend Setup

Open a second terminal:

```bash
cd nexora-frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in Xms
  ➜  Local:   http://localhost:5173/
```

### Step 4 — Seed Demo Data

Visit [http://localhost:5173](http://localhost:5173), go to the Dashboard, and click **Seed Demo Data**.

Or from the terminal:

```bash
curl -X POST http://localhost:3000/api/seed
# → {"success":true,"message":"Demo data seeded successfully"}
```

The seeder is fully idempotent. Running it multiple times creates no duplicates.

### Step 5 — Verify Everything Works

```bash
# Health check
curl http://localhost:3000/health

# Merchant profile
curl http://localhost:3000/api/me

# Virtual accounts (should show 4 after seeding)
curl http://localhost:3000/api/accounts

# Exceptions (should show 2 after seeding)
curl http://localhost:3000/api/exceptions

# Reconciliation report
curl http://localhost:3000/api/reconciliation/report
```

### Step 6 — Optional: Live Nomba Webhooks

To receive real Nomba webhook events instead of using the simulation tool:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Copy the `https://` URL. In the Nomba sandbox dashboard:

1. **Settings → Webhooks**
2. URL: `https://your-tunnel.ngrok.io/webhooks/nomba`
3. Secret: `NombaHackathon2026`
4. Enable: `virtual_account.funded`, `transfer.success`, `transfer.failed`

### Reset the Database

```bash
cd nexora-backend
npx prisma db push --force-reset
curl -X POST http://localhost:3000/api/seed
```

---

## The Complete Demo Flow

Follow this sequence to demonstrate every feature and edge case in under ten minutes.

### 1. Seed (30 seconds)
Click **Seed Demo Data** on the Dashboard. This creates:
- 4 customers (2 Tier 1, 2 Tier 2 with BVN)
- 4 virtual accounts with NUBAN-format account numbers
- 4 invoices at varying amounts
- 7 transactions covering every reconciliation outcome
- Merchant service history and a settlement record

**The 7 seed transactions:**

| # | Sender | Amount | Invoice | Outcome |
|---|---|---|---|---|
| T1 | Adaeze Okafor | ₦120,000 | ₦120,000 | ✅ MATCHED |
| T2 | Emeka Nwosu | ₦52,000 | ₦52,000 | ✅ MATCHED |
| T3 | Fatima Aliyu | ₦18,000 | ₦24,000 | 🟡 PARTIAL |
| T4 | Fatima Aliyu | ₦6,000 | ₦6,000 remaining | ✅ MATCHED (invoice closed) |
| T5 | Fatima Aliyu | ₦50,000 | No open invoice | 🔴 OVERPAYMENT exception |
| T6a | Chidi Eze | ₦40,000 | ₦40,000 | ✅ MATCHED |
| T6b | Unknown Sender | ₦15,000 | No open invoice | 🔴 UNMATCHED exception |

### 2. KYC Upgrade — Customers Page
Visit `/customers`.
- Adaeze and Fatima show **Tier 2** emerald badges
- Emeka and Chidi show amber **Tier 1 — Upgrade** badges
- Click Emeka's badge → enter any 11-digit BVN → **Upgrade to Tier 2**
- Badge flips to emerald immediately

### 3. Account Lifecycle — Accounts Page
Visit `/accounts`. On any card, open the **⋮ kebab menu**:
- **Rename** → type new name → Save. Card updates instantly.
- **Freeze** → accent bar turns blue; notice explains frozen payments raise exceptions
- **Unfreeze** → restores ACTIVE
- **Close** → confirmation modal; if balance > 0, Close button is disabled until consent checkbox is ticked; after closing, card dims and all actions are removed

### 4. Invoice Verification
Visit `/invoices`:
- Adaeze: **PAID** (T1)
- Emeka: **PAID** (T2)
- Fatima: **PAID** (T3 + T4)
- Chidi: **PAID** (T6a)

Create a new invoice for any customer, then go to Transactions to pay it.

### 5. Simulate a Payment — Transactions Page
Visit `/transactions` → **Simulate Webhook** → choose an account → enter an amount → **Dispatch**.

Try these to see different outcomes:
- Exact invoice amount → MATCHED, invoice → PAID
- Half the invoice amount → PARTIAL
- More than 102% of the amount → MATCHED + OVERPAYMENT exception in Reconciliation

### 6. Exceptions & Reconciliation — Reconciliation Page
Visit `/unmatched` → **Exceptions** tab:
- Fatima's ₦50,000 overpayment (OVERPAYMENT)
- Unknown sender's ₦15,000 (UNMATCHED)
- Both show aging in days and a **Match** button
- Click Match → exception resolved → badge flips to "Matched"

Switch to the **Report** tab: live collection efficiency %, total volume, matched value, exception value.

### 7. Account Statement — Statements Page
Visit `/statements` → select Fatima's account.
Three credit entries visible: ₦18,000, ₦6,000, ₦50,000 — with running balance after each.

### 8. Merchant Hub
Visit `/merchant`:
- Live balance displayed
- Select **Airtime** → phone number → ₦1,000 → Initiate → appears in history as SUCCESS
- Try a ₦600,000 Bank Transfer → goes to **Approvals** tab
- Approve or Reject it from the Approvals tab

### 9. Developer API
Visit `/developers`:
- Live OpenAPI spec rendered from the backend
- Download Postman Collection or OpenAPI JSON
- Copy API key from Settings, then test:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/public/v1/virtual-accounts

# Idempotent provisioning
curl -X POST http://localhost:3000/api/public/v1/virtual-accounts \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -H "x-idempotency-key: test-key-001" \
     -d '{"accountName":"TEST COLLECTIONS","email":"test@example.ng","phone":"08011111111"}'

# Run same request again — returns same account, no duplicate
curl -X POST http://localhost:3000/api/public/v1/virtual-accounts \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -H "x-idempotency-key: test-key-001" \
     -d '{"accountName":"TEST COLLECTIONS","email":"test@example.ng","phone":"08011111111"}'
```

---

## Full API Reference

### Health & Meta

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health check |
| GET | `/api/me` | Merchant profile and API key |
| GET | `/api/docs` | Live OpenAPI specification |
| POST | `/api/seed` | Seed demo data (idempotent) |
| GET | `/openapi.json` | Download OpenAPI spec |
| GET | `/postman_collection.json` | Download Postman collection |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Create customer; BVN → Tier 2 automatically |
| PATCH | `/api/customers/:id` | Update fields; add BVN to trigger KYC upgrade |

### Virtual Accounts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/accounts` | All accounts with balance + transaction count |
| POST | `/api/accounts` | Provision via Nomba; enforces one account per customer |
| PATCH | `/api/accounts/:id` | Rename or change status (ACTIVE / FROZEN) |
| DELETE | `/api/accounts/:id` | Close; blocked if balance > 0 without `?force=true` |

### Invoices

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invoices` | All invoices with customer and payment status |
| POST | `/api/invoices` | Create invoice linked to a customer |

### Transactions & Reconciliation

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | All inbound transactions |
| POST | `/api/simulate` | Simulate inbound webhook for demo |
| GET | `/api/exceptions` | Unmatched, overpaid, and misdirected payments |
| POST | `/api/exceptions/:id/resolve` | Manually resolve an exception |
| GET | `/api/reconciliation/report` | Collection efficiency, counts, naira volumes |
| GET | `/api/statements/:accountId` | Full running ledger for an account |

### Merchant Hub

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/merchant/balance` | Live balance (synced from Nomba) |
| GET | `/api/merchant/settlements` | Settlement sweep history |
| GET | `/api/services` | Outgoing payment history |
| GET | `/api/services/approvals` | Payments pending approval (≥ ₦500,000) |
| POST | `/api/services/pay` | Initiate airtime, data, bills, or transfer |
| POST | `/api/services/:id/approve` | Approve a queued payment |
| POST | `/api/services/:id/reject` | Reject a queued payment |

### Webhook (Inbound from Nomba)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/webhooks/nomba` | Receives and processes Nomba events; signature-verified |

### Public Developer API
All routes require `Authorization: Bearer <apiKey>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/public/v1/virtual-accounts` | Provision account; idempotency via `x-idempotency-key` |
| GET | `/api/public/v1/virtual-accounts` | List accounts; filter by `?customerId` or `?status` |
| GET | `/api/public/v1/virtual-accounts/:ref` | Single account with customer details |
| GET | `/api/public/v1/statements/:ref` | Account ledger; filter by `?from` and `?to` dates |
| GET | `/api/public/v1/reconciliation/report` | Live reconciliation metrics |
| GET | `/api/public/v1/exceptions` | Exception list; filter by `?resolved=true/false` |
| POST | `/api/public/v1/exceptions/:id/resolve` | Resolve exception via API |
| POST | `/api/public/v1/transfers` | Outbound transfer; lookup enforced before execution |

---

## Judging Criteria — How We Address Each One

### A Real Nigerian Business Problem (20%)

This is not a hypothetical use case built to fit a hackathon brief. It is the daily operating reality of tens of millions of Nigerian business owners. Our mother is one of them. The inability to automatically match incoming bank transfers to specific customers causes real financial loss, customer disputes, and hours of manual labour every single day across Nigerian commerce.

Nomba described the structural problem precisely: *"The moment you cannot tell what your business actually earned last month, you are flying blind."* Nexora gives business owners the visibility that transforms a side hustle into a structured business — the missing layer between Nomba's world-class infrastructure and the operational clarity that Nigerian MSMEs desperately need.

### Strong Technical Implementation (25%)

- Reconciliation engine handles **five distinct payment scenarios** with correct, distinct outcomes for each
- **FIFO invoice matching** ensures payments are applied to the oldest outstanding invoice, preventing misallocation
- **Atomic Prisma `$transaction`** on every reconciliation event — ledger, invoice, and transaction record always agree, even if the server crashes mid-write
- **Catch-all holding account** — no funds are ever silently discarded; every naira is accounted for
- **2% overpayment tolerance** reflects how Nigerian bank rails actually work and prevents false exceptions from rounding
- **Full audit trail** — raw webhook payloads stored before processing; every state change traceable
- **Token caching** — Nomba OAuth2 tokens cached in memory, refreshed at 55-minute mark, never wasted per-call
- **1,800+ lines of backend logic** across 9 route files and a dedicated reconciliation service

### Security and Reliability Built In From Day One (20%)

- HMAC-SHA256 webhook verification using `crypto.timingSafeEqual` (timing-attack resistant)
- Raw request body (not parsed JSON) used for digest computation
- Idempotency on every inbound event via unique `nombaRequestId` index — no double-credits possible
- Webhooks ACKed before processing — Nomba never retries due to our processing time
- All credentials in environment variables only — never in source
- Approval queue for outgoing payments above ₦500,000
- Bank account lookup enforced before every outbound transfer — structurally unavoidable
- Catch-all account for every misdirected naira
- Raw webhook event log enables replay and audit

### Deep Nomba Integration (20%)

15 distinct Nomba API functions integrated across 6 product areas: Authentication, Virtual Accounts, Transactions (requery), Transfers (lookup + execute), Bills (airtime, data, electricity, cable, betting), and Balance. Webhooks handled for three event types. The integration follows every Nomba certification best practice: `client_credentials` grant, token caching, idempotency keys, kobo/naira amount handling, and requery keyed on `sessionId` not `merchantTxRef`.

### Polished User Experience (15%)

- Animated account cards with per-status colour coding — green (ACTIVE), blue (FROZEN), red (CLOSED) accent bars
- Framer Motion transitions on modals, form panels, and table rows
- Inline KYC upgrade flow — no separate page, no navigation, no page reload
- Balance guard on account closure with explicit consent checkbox — can't close by accident
- Freeze notice explains the reconciliation implication in plain language
- Real-time simulate-and-watch — dispatch a webhook, see the invoice status change without touching the page
- Contextual kebab menus — actions disappear when they are no longer valid (closed accounts)
- Loading skeletons throughout — no blank states while data fetches
- Sonner toasts for every action outcome, including backend error messages surfaced clearly

---

## What Comes Next

If Nexora were a production product rather than a hackathon submission, the immediate next steps would be:

1. **PostgreSQL** — one line change in `prisma/schema.prisma` and `DATABASE_URL`
2. **Webhook replay** — re-process any `WebhookEvent` that failed without contacting Nomba
3. **Nightly reconciliation job** — automated diff of Nomba's `/v1/transactions` feed against the local ledger, keyed on `sessionId` for requery
4. **SMS/email alerts** — notify the merchant when an exception is raised; notify the customer when their invoice is paid
5. **Sub-account architecture** — each customer's virtual account provisioned under a Nomba sub-account so balances are isolated at the infrastructure level
6. **Multi-merchant support** — the data model already separates everything by `merchantId`; the API layer needs tenant scoping added
7. **Role-based access control** — separate permissions for viewing statements, approving transfers, and managing customers
8. **Export to CSV and PDF** — statements and exception reports in formats accountants actually use
9. **Direct debit mandates** — for merchants with subscription or recurring collection models

---

## The People Behind This

We built Nexora during the Nomba × DevCareer Hackathon 2026. We thought about our mother every day we were building it. We thought about every market woman, every small business owner, every informal lender who has had to call a customer to ask *"was that transfer from you?"*

They deserve better infrastructure. Nigeria deserves better infrastructure.

The side hustle era is about survival. The structured business era is about growth. Nexora is the system that makes that transition possible — not for one business, but for every business that runs on Nomba.

---

*Built on Nomba · Powered by purpose · Dedicated to the millions of Nigerian business owners who do more with less, every single day.*
