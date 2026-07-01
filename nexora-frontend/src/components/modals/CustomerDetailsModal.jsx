import { useEffect, useRef, useState, useCallback } from "react"
import Badge from "../ui/Badge"
import Table from "../ui/Table"
import Button from "../ui/Button"

const statusBadge = { Active: "success", Pending: "warning", Inactive: "neutral" }

const txStatusBadge = { Matched: "success", Partial: "warning", Unmatched: "error" }

const srStatusBadge = { Completed: "success", Pending: "warning" }

const TX_COLUMNS = [
  { key: "id", label: "Transaction ID" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Date" },
  { key: "status", label: "Payment Status", render: (v) => <Badge variant={txStatusBadge[v]}>{v}</Badge> },
  { key: "reference", label: "Reference" },
]

const TX_DATA = [
  { id: "TXN-3842", amount: "$12,400", date: "Jun 25, 2026", status: "Matched", reference: "INV-2026-0842" },
  { id: "TXN-3810", amount: "$8,900", date: "Jun 22, 2026", status: "Matched", reference: "INV-2026-0810" },
  { id: "TXN-3795", amount: "$3,200", date: "Jun 18, 2026", status: "Partial", reference: "INV-2026-0795" },
  { id: "TXN-3771", amount: "$15,000", date: "Jun 14, 2026", status: "Matched", reference: "INV-2026-0771" },
  { id: "TXN-3740", amount: "$6,750", date: "Jun 10, 2026", status: "Unmatched", reference: "INV-2026-0740" },
  { id: "TXN-3722", amount: "$9,300", date: "Jun 7, 2026", status: "Matched", reference: "INV-2026-0722" },
  { id: "TXN-3698", amount: "$4,800", date: "Jun 3, 2026", status: "Matched", reference: "INV-2026-0698" },
  { id: "TXN-3670", amount: "$11,200", date: "May 30, 2026", status: "Partial", reference: "INV-2026-0670" },
]

const SR_COLUMNS = [
  { key: "id", label: "Sales ID" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Created" },
  { key: "status", label: "Status", render: (v) => <Badge variant={srStatusBadge[v]}>{v}</Badge> },
]

const SR_DATA = [
  { id: "SR-2026-0891", description: "Q2 Subscription Renewal", amount: "$12,400", date: "Jun 25, 2026", status: "Completed" },
  { id: "SR-2026-0862", description: "Enterprise Add-on License", amount: "$8,900", date: "Jun 22, 2026", status: "Completed" },
  { id: "SR-2026-0833", description: "Premium Support Package", amount: "$3,200", date: "Jun 18, 2026", status: "Pending" },
  { id: "SR-2026-0804", description: "Annual Maintenance Fee", amount: "$15,000", date: "Jun 14, 2026", status: "Completed" },
]

const ACTIVITY = [
  { icon: "payment", label: "Payment received — $12,400", time: "2 min ago" },
  { icon: "document", label: "Sales record generated — SR-2026-0891", time: "1 hour ago" },
  { icon: "edit", label: "Virtual account details updated", time: "3 hours ago" },
  { icon: "user", label: "Profile assigned to Senior Account Manager", time: "1 day ago" },
  { icon: "check", label: "Reconciliation cycle completed", time: "2 days ago" },
]

const activityIcons = {
  payment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
}

function SummaryCard({ icon, label, value, accent }) {
  return (
    <div className="bg-bg/60 border border-border rounded-lg p-4">
      <div className={`${accent ? "text-amber-500" : "text-primary"} mb-2`}>{icon}</div>
      <p className="text-xs text-muted font-medium">{label}</p>
      <p className="text-lg font-semibold text-text mt-0.5">{value}</p>
    </div>
  )
}

function Timeline({ items }) {
  return (
    <div className="relative">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 pb-5 last:pb-0 relative">
          {i < items.length - 1 && (
            <div className="absolute left-[7px] top-[22px] bottom-0 w-px bg-border" />
          )}
          <div className="w-4 h-4 rounded-full border-2 border-primary bg-surface flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm text-text">{item.label}</p>
            <p className="text-xs text-muted mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CustomerDetailsModal({ customer, onClose }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef(null)

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleClose])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) handleClose()
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [handleClose])

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  if (!customer) return null

  const summaryCards = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      label: "Total Payments Received",
      value: customer.totalPayments,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      label: "Successful Payments",
      value: "42",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      label: "Pending Payments",
      value: "3",
      accent: true,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      label: "Sales Records Generated",
      value: "18",
    },
  ]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-8 px-4 transition-all duration-200 ${
        visible ? "bg-black/20" : "bg-transparent"
      }`}
    >
      <div
        ref={panelRef}
        className={`w-full max-w-[900px] bg-surface rounded-xl border border-border shadow-sm transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="p-8 pb-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-base font-semibold text-primary shrink-0">
                  {customer.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-semibold text-text">{customer.name}</h2>
                    <Badge variant={statusBadge[customer.status]}>{customer.status}</Badge>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{customer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-bg/50 border border-border rounded-lg shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-sm font-mono font-medium text-text">{customer.virtualAccount}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-border/40 transition-colors duration-150 relative"
                  aria-label="Copy virtual account number"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white bg-text px-2 py-1 rounded whitespace-nowrap">
                      Copied
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 pt-6 space-y-8">
            <section>
              <h3 className="text-sm font-semibold text-text mb-4">Payment Summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, i) => (
                  <SummaryCard key={i} {...card} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-text mb-4">Transaction History</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table columns={TX_COLUMNS} data={TX_DATA} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-text mb-4">Sales Records Generated</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table columns={SR_COLUMNS} data={SR_DATA} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-text mb-4">Recent Activity</h3>
              <div className="border border-border rounded-lg p-5">
                <Timeline items={ACTIVITY} />
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between px-8 py-4 border-t border-border bg-bg/30 rounded-b-xl">
          <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
          <Button variant="secondary" size="sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
