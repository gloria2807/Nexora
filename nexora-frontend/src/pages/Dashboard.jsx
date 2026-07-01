import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import DataTable from "../components/ui/DataTable";
import { Link } from "react-router";
import { Database } from "lucide-react";

const kpiData = [
  {
    label: "Dedicated Accounts",
    value: "486",
    trend: "+12",
    trendUp: true,
    subtitle: "Provisioned this month",
  },
  {
    label: "Reconciled Transfers",
    value: "12,847",
    trend: "92.4%",
    trendUp: true,
    subtitle: "Automatic match rate",
  },
  {
    label: "Exceptions",
    value: "347",
    trend: "Needs Review",
    trendUp: false,
    subtitle: "Partial / unmatched",
  },
  {
    label: "Statements",
    value: "14,892",
    trend: "+8%",
    trendUp: true,
    subtitle: "Generated automatically",
  },
];

const transactionColumns = [
  { key: "id", label: "Reference" },
  { key: "customer", label: "Customer" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Date" },
  {
    key: "status",
    label: "Status",
    render: (val) => {
      const map = {
        Matched: "success",
        Partial: "warning",
        Unmatched: "error",
      };
      return <Badge variant={map[val]}>{val}</Badge>;
    },
  },
];

const transactionData = [
  { id: "TXN-3842", customer: "Acme Corp", amount: "₦120,000", date: "Today", status: "Matched" },
  { id: "TXN-3841", customer: "Globex", amount: "₦52,000", date: "Today", status: "Matched" },
  { id: "TXN-3840", customer: "Initech", amount: "₦24,000", date: "Yesterday", status: "Partial" },
  { id: "TXN-3839", customer: "Umbrella", amount: "₦40,000", date: "Yesterday", status: "Unmatched" },
];

export default function Dashboard() {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: api.seedData,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Demo data seeded successfully!");
    },
    onError: () => {
      toast.error("Failed to seed demo data");
    },
  });

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* HERO */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">

          {/* LEFT */}
          <div className="flex-1">

            <span className="inline-flex px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs sm:text-sm font-medium">
              Dedicated Virtual Account Infrastructure
            </span>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-text leading-tight">
              Turn raw bank transfers
              <br className="hidden sm:block" />
              into structured business records.
            </h1>

            <p className="mt-5 text-sm sm:text-base text-muted max-w-2xl leading-7">
              Provision customer-named virtual accounts, reconcile inbound transfers automatically,
              generate statements, detect exceptions and expose clean APIs for downstream integrations.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition">
                <Link to="/customers">Provision Customer</Link>
              </button>

              <button className="px-6 py-3 rounded-xl border border-border hover:bg-border/40 transition">
                <Link to="/transactions">Review Payments</Link>
              </button>
            </div>

          </div>

          {/* RIGHT */}
          <div className="hidden lg:flex flex-col gap-4 w-72">

            {/* TOP RIGHT SEED BUTTON */}
            <div className="flex justify-end">
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border rounded-md text-muted transition disabled:opacity-50 cursor-pointer"
              >
                <Database className="w-3 h-3 text-gold" />
                {seedMutation.isPending ? "..." : "Seed"}
              </button>
            </div>

            {/* Collection Efficiency */}
            <div className="rounded-2xl bg-primary-light p-5">
              <p className="text-xs uppercase tracking-wider text-muted">
                Collection Efficiency
              </p>
              <p className="text-4xl font-bold mt-2 text-primary">
                92.4%
              </p>
            </div>

            {/* Today's Collections */}
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted">
                Today's Collections
              </p>
              <p className="text-3xl font-bold mt-2">
                ₦8.2M
              </p>
            </div>

          </div>
        </div>

        {/* MOBILE STATS */}
        <div className="grid grid-cols-2 gap-4 mt-8 lg:hidden">
          <div className="rounded-2xl bg-primary-light p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Collection Efficiency
            </p>
            <p className="text-2xl font-bold text-primary mt-2">
              92.4%
            </p>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Today's Collections
            </p>
            <p className="text-2xl font-bold mt-2">
              ₦8.2M
            </p>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {kpiData.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-xs uppercase tracking-wider text-muted">
              {kpi.label}
            </p>
            <h2 className="text-3xl font-bold mt-3">
              {kpi.value}
            </h2>
            <div className="mt-2 flex flex-col gap-1">
              <span className={kpi.trendUp ? "text-emerald-600 text-sm" : "text-amber-600 text-sm"}>
                {kpi.trend}
              </span>
              <span className="text-xs text-muted">
                {kpi.subtitle}
              </span>
            </div>
          </Card>
        ))}
      </div>
      {/* TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-semibold mb-4">Recent Transactions</h2>

            <Table
              columns={transactionColumns}
              data={transactionData}
            />
          </Card>
        </div>

        <Card>
          <h2 className="font-semibold mb-5">Reconciliation Summary</h2>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm">
                <span>Matched</span>
                <span className="font-semibold">92%</span>
              </div>
              <div className="w-full h-2 bg-border rounded mt-2">
                <div className="w-[92%] h-full bg-primary rounded"></div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span>Statements Generated</span>
              <span className="font-semibold">14,892</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Exceptions</span>
              <span className="text-amber-600 font-semibold">347</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Average Processing</span>
              <span className="font-semibold">2.4 sec</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}