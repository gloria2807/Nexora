import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import React, { useState } from 'react';
import {
  Briefcase, Send, Phone, Wifi, Tv, Lightbulb,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { DataTable } from '../components/ui/DataTable';
import { toast } from 'sonner';

export default function Merchant() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('hub');

  const { data: merchant, isLoading: loadingMerchant } = useQuery({
    queryKey: ['merchant'],
    queryFn: api.getMerchantBalance,
  });

  // FIX: backend returns plain array, not { services: [] }
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
  });
  const services = Array.isArray(servicesData) ? servicesData : [];

  const { data: approvalsData, isLoading: loadingApprovals } = useQuery({
    queryKey: ['approvals'],
    queryFn: api.getPendingApprovals,
  });
  const approvals = Array.isArray(approvalsData) ? approvalsData : [];

  const { data: settlementsData, isLoading: loadingSettlements } = useQuery({
    queryKey: ['settlements'],
    queryFn: api.getSettlements,
  });
  const settlements = Array.isArray(settlementsData) ? settlementsData : [];

  const approveMutation = useMutation({
    mutationFn: api.approveService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      toast.success('Transaction approved successfully');
    },
    onError: (error) => toast.error(error.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: api.rejectService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      toast.success('Transaction rejected');
    },
    onError: (error) => toast.error(error.message || 'Failed to reject'),
  });

  const payServiceMutation = useMutation({
    mutationFn: api.payService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setPayForm({ type: 'AIRTIME', amount: '', destination: '' });
      toast.success('Transaction initiated successfully');
    },
    onError: (error) => toast.error(error.message || 'Failed to initiate transaction'),
  });

  const [payForm, setPayForm] = useState({ type: 'AIRTIME', amount: '', destination: '' });

  const handlePay = (e) => {
    e.preventDefault();
    payServiceMutation.mutate({
      type: payForm.type,
      amount: parseFloat(payForm.amount),
      destination: payForm.destination,
    });
  };

  const approvalColumns = [
    {
      header: 'Time', accessorKey: 'createdAt', sortable: true,
      cell: (item) => <span className="text-muted font-mono text-xs whitespace-nowrap">{format(new Date(item.createdAt), 'MMM d, HH:mm')}</span>,
    },
    {
      header: 'Service Type', accessorKey: 'type', sortable: true,
      cell: (item) => <span className="text-text text-xs font-bold">{item.type}</span>,
    },
    {
      header: 'Destination', accessorKey: 'destination', sortable: true,
      cell: (item) => <span className="text-muted font-mono text-xs">{item.destination}</span>,
    },
    {
      header: 'Amount', accessorKey: 'amount', sortable: true,
      cell: (item) => <span className="text-text font-mono text-xs font-bold">₦{item.amount.toLocaleString()}</span>,
    },
    {
      header: 'Actions', accessorKey: 'id',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => rejectMutation.mutate(item.id)} disabled={rejectMutation.isPending || approveMutation.isPending}
            className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase cursor-pointer">
            Reject
          </button>
          <button onClick={() => approveMutation.mutate(item.id)} disabled={approveMutation.isPending || rejectMutation.isPending}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase cursor-pointer">
            Approve
          </button>
        </div>
      ),
    },
  ];

  const historyColumns = [
    {
      header: 'Time', accessorKey: 'createdAt', sortable: true,
      cell: (item) => <span className="text-muted font-mono text-xs whitespace-nowrap">{format(new Date(item.createdAt), 'MMM d, HH:mm:ss')}</span>,
    },
    {
      header: 'Type', accessorKey: 'type', sortable: true,
      cell: (item) => <span className="text-text text-xs font-bold">{item.type}</span>,
    },
    {
      header: 'Destination', accessorKey: 'destination', sortable: true,
      cell: (item) => <span className="text-muted font-mono text-xs">{item.destination}</span>,
    },
    {
      header: 'Amount', accessorKey: 'amount', sortable: true,
      cell: (item) => <span className="text-text font-mono text-xs font-bold">₦{item.amount.toLocaleString()}</span>,
    },
    {
      header: 'Status', accessorKey: 'status', sortable: true,
      cell: (item) => (
        <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase",
          item.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : item.status === 'FAILED' || item.status === 'REJECTED' ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-border/30 text-muted border border-border/60")}>
          {item.status}
        </span>
      ),
    },
    {
      header: 'Reference', accessorKey: 'reference',
      cell: (item) => <span className="text-muted font-mono text-[10px]">{item.reference}</span>,
    },
  ];

  const settlementColumns = [
    {
      header: 'Date', accessorKey: 'createdAt', sortable: true,
      cell: (item) => <span className="text-muted font-mono text-xs whitespace-nowrap">{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>,
    },
    {
      header: 'Amount', accessorKey: 'amount', sortable: true,
      cell: (item) => <span className="text-emerald-700 font-mono text-xs font-bold">₦{item.amount.toLocaleString()}</span>,
    },
    {
      header: 'Status', accessorKey: 'status',
      cell: (item) => <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold uppercase">{item.status}</span>,
    },
    {
      header: 'Reference', accessorKey: 'reference',
      cell: (item) => <span className="text-muted font-mono text-[10px]">{item.reference}</span>,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">

      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl min-w-50">
          <p className="text-[10px] text-muted uppercase font-bold">Available Balance</p>
          {loadingMerchant ? (
            <div className="h-8 w-32 bg-border/50 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-mono text-text">
              ₦{merchant?.merchantBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div className="flex bg-surface border border-border p-1 rounded-xl w-max overflow-x-auto">
        {[
          { id: 'hub', label: 'Services Hub' },
          { id: 'approvals', label: `Approvals${approvals.length > 0 ? ` (${approvals.length})` : ''}` },
          { id: 'history', label: 'Transaction History' },
          { id: 'settlements', label: 'Settlements' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer",
              activeTab === tab.id ? "bg-border text-text" : "text-muted hover:text-text")}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-text">Vending & Outgoing Transfers</h2>
            <form onSubmit={handlePay} className="bg-surface border border-border rounded-xl p-6 space-y-6">
              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-3">Service Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'BANK TRANSFER', icon: Send, label: 'Bank Tx' },
                    { id: 'WALLET TRANSFER', icon: Send, label: 'Wallet Tx' },
                    { id: 'AIRTIME', icon: Phone, label: 'Airtime' },
                    { id: 'DATA', icon: Wifi, label: 'Data' },
                    { id: 'CABLE', icon: Tv, label: 'Cable TV' },
                    { id: 'ELECTRICITY', icon: Lightbulb, label: 'Power' },
                    { id: 'BETTING', icon: Briefcase, label: 'Betting' },
                  ].map((svc) => (
                    <button key={svc.id} type="button" onClick={() => setPayForm({ ...payForm, type: svc.id })}
                      className={cn("flex flex-col items-center justify-center p-4 rounded-xl border transition-colors cursor-pointer",
                        payForm.type === svc.id ? "bg-border text-text" : "text-muted hover:text-text")}>
                      <svc.icon className="w-5 h-5 mb-2" />
                      <span className="text-[10px] font-bold uppercase">{svc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" value={payForm.destination} onChange={(e) => setPayForm({ ...payForm, destination: e.target.value })}
                placeholder="Destination (Account / Phone / Meter)"
                className="w-full bg-surface border border-border p-3 rounded-lg text-text text-sm font-mono" required />
              <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                placeholder="Amount" className="w-full bg-surface border border-border p-3 rounded-lg text-text text-sm font-mono" required />
              <p className="text-[10px] text-muted">Transactions above ₦500,000 will be queued for approval.</p>
              <button type="submit" disabled={payServiceMutation.isPending}
                className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-3 rounded-lg uppercase text-sm cursor-pointer">
                {payServiceMutation.isPending ? 'Processing...' : `Initiate ${payForm.type}`}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text">Recent Activity</h2>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="text-sm">
                  {loadingServices ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-4"><div className="h-4 w-16 rounded bg-border/50 animate-pulse mb-2" /><div className="h-3 w-24 rounded bg-border/50 animate-pulse" /></td>
                        <td className="p-4"><div className="h-4 w-20 rounded bg-border/50 animate-pulse" /></td>
                        <td className="p-4 text-right"><div className="h-5 w-16 rounded bg-border/50 animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : services.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-muted">No recent activity.</td></tr>
                  ) : (
                    services.slice(0, 5).map((tx) => (
                      <tr key={tx.id} className="border-b border-border hover:bg-border/30 transition-colors">
                        <td className="p-4">
                          <span className="text-xs font-bold text-text uppercase">{tx.type}</span>
                          <p className="text-[10px] text-muted font-mono mt-1 truncate max-w-30">{tx.destination}</p>
                        </td>
                        <td className="p-4"><span className="text-text font-mono text-xs font-bold">₦{tx.amount.toLocaleString()}</span></td>
                        <td className="p-4 text-right">
                          <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase",
                            tx.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : tx.status === 'FAILED' || tx.status === 'REJECTED' ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-border/30 text-muted border border-border/60")}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="border-t border-border p-4 text-center bg-surface">
                <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-text hover:text-muted uppercase cursor-pointer">
                  View All History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <DataTable columns={approvalColumns} data={approvals} isLoading={loadingApprovals}
          searchKey="destination" searchPlaceholder="Search approvals by destination..." emptyMessage="No pending approvals." />
      )}

      {activeTab === 'history' && (
        <DataTable columns={historyColumns} data={services} isLoading={loadingServices}
          searchKey="reference" searchPlaceholder="Search history by reference..." emptyMessage="No transactions found." />
      )}

      {activeTab === 'settlements' && (
        <>
          <div className="bg-surface border border-border p-6 rounded-xl">
            <h2 className="text-lg font-bold text-text">Automated Settlements</h2>
            <p className="text-sm text-muted mt-2">Settlements sweep funds from your merchant balance to your primary corporate bank account automatically at the end of each day.</p>
          </div>
          <DataTable columns={settlementColumns} data={settlements} isLoading={loadingSettlements}
            searchKey="reference" searchPlaceholder="Search settlements by reference..." emptyMessage="No settlements found." />
        </>
      )}
    </div>
  );
}
