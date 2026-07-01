<<<<<<< HEAD
# Nexora
A modern fintech dashboard for automated payment reconciliation, customer management, and sales record generation.
=======
# Nexora — Payment Reconciliation Dashboard

A professional fintech frontend for reconciling payments, managing customers, and tracking transaction history. Built as a static React shell — all data is mock, ready for backend integration.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Open `http://localhost:5173` after running `npm run dev`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 (CSS‑based config — no `tailwind.config.js`) |
| Routing | React Router v7 |
| Font | Inter (Google Fonts) |

Zero other dependencies. No icon libraries, no chart libraries, no UI kits — every visual element is hand-built with Tailwind utility classes and inline SVGs.

---

## Project Structure

```
src/
├── components/
│   ├── layout/              # App shell
│   │   ├── Sidebar.jsx       # Logo, navigation links, user profile
│   │   ├── TopNav.jsx        # Search bar, notifications, user avatar
│   │   └── PageContainer.jsx # Title + subtitle + content wrapper
│   ├── ui/                   # Reusable primitives
│   │   ├── Card.jsx          # Surfaces (border + radius + padding)
│   │   ├── Button.jsx        # 3 variants, 3 sizes, disabled state
│   │   ├── Badge.jsx         # Status pills (success/warning/error/neutral)
│   │   └── Table.jsx         # Column‑configurable table with render props
│   └── modals/
│       └── CustomerDetailsModal.jsx  # Full customer profile modal
├── pages/
│   ├── Dashboard.jsx         # KPI cards + transactions + summary
│   ├── Customers.jsx         # Customer list with search/filter/sort
│   └── UnmatchedPayments.jsx # Unmatched payments table with Match action
├── App.jsx                   # Router + layout orchestration
├── main.jsx                  # Entry point
└── index.css                 # Tailwind imports + theme tokens + base styles
```

---

## Design System

All tokens live in `src/index.css` under the `@theme` block:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FAF7F2` | Page background |
| `--color-surface` | `#FFFFFF` | Card / sidebar / topnav backgrounds |
| `--color-primary` | `#C8A27A` | Buttons, active nav, accents |
| `--color-primary-hover` | `#B38B63` | Button hover |
| `--color-primary-light` | `#F5EDE4` | Active nav background |
| `--color-border` | `#E8E2D8` | All borders, dividers |
| `--color-text` | `#2B2B2B` | Body text |
| `--color-muted` | `#6B7280` | Secondary text, labels |

Apply with Tailwind utility classes: `bg-surface`, `text-primary`, `border-border`, `text-muted`, etc.

---

## What Each Page Does

### Dashboard `/`

Four KPI cards (Total Payments, Reconciled Payments, Unmatched Payments, Total Customers) + a two‑column layout with **Recent Transactions** table (left) and **Reconciliation Summary** with progress bar (right).

### Customers `/customers`

Toolbar with search input, status filter (All / Active / Pending / Inactive), sort dropdown (Newest / Oldest / Highest Payments), and Add Customer button. Summary row showing total customers, active accounts, and total revenue. Customer table with avatar, name, email, virtual account, payment stats, status badge, and a **View Details** button that opens the modal.

### Unmatched Payments `/unmatched`

Alert banner for manual review + table of unassigned payments with aging badges and Match buttons.

---

## Key UI Patterns

### Table
```jsx
const columns = [
  { key: "name", label: "Customer" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status", render: (val) => <Badge variant="success">{val}</Badge> },
  { key: "actions", label: "", render: (_, row) => <Button>View Details</Button> },
]

<Table columns={columns} data={customers} rowKey="id" />
```

Every `<Table>` requires a `rowKey` prop — always use a unique identifier from your data (`id`, `transactionId`, etc.).

### Button
```jsx
<Button variant="primary" size="md">   // Solid gold
<Button variant="secondary" size="sm">  // Outlined
<Button variant="ghost">               // Text only
```

### Badge
```jsx
<Badge variant="success">Active</Badge>   // Green
<Badge variant="warning">Pending</Badge>  // Amber
<Badge variant="error">Unmatched</Badge>  // Red
<Badge variant="neutral">Inactive</Badge> // Grey
```

### Card
```jsx
<Card className="p-0">       // Remove default padding for full‑width tables
<Card>                       // Standard padded card
```

---

## Customer Details Modal

When a user clicks **View Details** in the Customers table, a centered modal opens with:

| Section | Content |
|---|---|
| Header | Avatar (initials), name, status badge, email, virtual account with copy button |
| Payment Summary | 4 stat cards (Received, Successful, Pending, Sales Records) |
| Transaction History | 8‑row table with ID, amount, date, status badge, reference |
| Sales Records | 4‑row table with ID, description, amount, date, status badge |
| Recent Activity | Timeline with 5 events (icon + label + relative time) |
| Footer | Close button + Export Profile button |

**Behaviour:**
- Animate in: fade + scale (200ms)
- Close on: Escape key, click outside panel, or Close button
- Body scroll is locked while the modal is open

The modal receives two props:
```jsx
<CustomerDetailsModal
  customer={customerObject}   // Full customer object from the table row
  onClose={() => setSelectedCustomer(null)}
/>
```

All body data (transactions, sales records, activity) is currently mock — wire it to `GET /api/customers/:id` in the next phase.

---

## API Contracts

The frontend expects the following endpoints. All responses should be JSON.

### `GET /api/dashboard`

```json
{
  "kpis": {
    "totalPayments": { "value": 1284500, "trend": 8.2, "trendUp": true },
    "reconciledPayments": { "value": 12847, "matchRate": 92.4 },
    "unmatchedPayments": { "value": 1053, "percentage": 7.6 },
    "totalCustomers": { "value": 486, "newThisMonth": 12 }
  },
  "recentTransactions": [
    { "id": "TXN-3842", "customer": "Acme Corp", "amount": "$12,400", "date": "Jun 25, 2026", "status": "Matched" }
  ],
  "reconciliationSummary": {
    "rate": 92.4,
    "salesRecords": 14892,
    "pendingAssignments": 347,
    "avgProcessingTime": "2.4s"
  }
}
```

### `GET /api/customers?search=&status=All&sort=newest`

```json
{
  "customers": [
    {
      "id": 1,
      "name": "Acme Corp",
      "email": "billing@acme.com",
      "initials": "AC",
      "virtualAccount": "VA-3842-9101",
      "totalPayments": "$142,300",
      "totalPaymentsValue": 142300,
      "lastPaymentDate": "Jun 25, 2026",
      "lastPaymentRaw": "2026-06-25",
      "status": "Active"
    }
  ],
  "meta": {
    "total": 12,
    "active": 8,
    "totalReceived": 1601900
  }
}
```

Sort options: `newest`, `oldest`, `highest`. Status filter: `All`, `Active`, `Pending`, `Inactive`. Search matches against `name` and `virtualAccount`.

### `GET /api/customers/:id`

Returns the customer object + modal body data:

```json
{
  "customer": { "...": "..." },
  "transactions": [
    { "id": "TXN-3842", "amount": "$12,400", "date": "Jun 25, 2026", "status": "Matched", "reference": "INV-2026-0842" }
  ],
  "salesRecords": [
    { "id": "SR-2026-0891", "description": "Q2 Subscription Renewal", "amount": "$12,400", "date": "Jun 25, 2026", "status": "Completed" }
  ],
  "activity": [
    { "icon": "payment", "label": "Payment received — $12,400", "time": "2 min ago" }
  ]
}
```

`status` values for transactions: `Matched`, `Partial`, `Unmatched`.  
`status` values for sales records: `Completed`, `Pending`.  
`icon` values for activity: `payment`, `document`, `edit`, `user`, `check`.

### `GET /api/unmatched-payments`

```json
{
  "payments": [
    { "id": "REF-8832", "amount": "$4,200", "date": "Jun 22, 2026", "sender": "J. Smith", "days": 5 }
  ]
}
```

### `POST /api/customers/:id/match`

Request body: `{ "paymentId": "REF-8832" }`

---

## What's Ready for Integration

| Component | File | What to replace |
|---|---|---|
| Dashboard KPIs | `src/pages/Dashboard.jsx` | `kpiData` array at line 5 |
| Dashboard transactions | `src/pages/Dashboard.jsx` | `transactionData` array at line 77 |
| Dashboard summary | `src/pages/Dashboard.jsx` | `summaryItems` array at line 88 |
| Customers list | `src/pages/Customers.jsx` | `CUSTOMERS` array at line 8 |
| Customers summary | `src/pages/Customers.jsx` | `activeCount` / `totalReceived` at lines 100-101 |
| Unmatched payments | `src/pages/UnmatchedPayments.jsx` | `data` array at line 28 |
| Modal transactions | `src/components/modals/CustomerDetailsModal.jsx` | `TX_DATA` at line 20 |
| Modal sales records | `src/components/modals/CustomerDetailsModal.jsx` | `SR_DATA` at line 39 |
| Modal activity | `src/components/modals/CustomerDetailsModal.jsx` | `ACTIVITY` at line 46 |
| Sidebar user | `src/components/layout/Sidebar.jsx` | Hardcoded "Jane Doe" at line 83 |
| TopNav avatar | `src/components/layout/TopNav.jsx` | Hardcoded "JD" at line 44 |

---

## What the Backend Developer Needs to Build

1. **API client layer** — e.g. `src/lib/api.js` with `fetch()` wrappers for all endpoints above
2. **Loading states** — each page needs a spinner / skeleton while data fetches
3. **Error handling** — error boundaries and toast/alert components for API failures
4. **Auth context** — a `UserProvider` to feed user data into Sidebar and TopNav
5. **Notifications** — the bell icon in TopNav needs a badge count from the server
6. **Global search** — the TopNav search input needs to submit queries to the server

---

## Scripts

```bash
npm run dev      # Start dev server on localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint across the project
```

---

## Browser Support

Modern browsers only (Chrome, Firefox, Safari, Edge). No IE11 support.
>>>>>>> 4456fc5 (Initial commit: Nexora payment reconciliation dashboard)
