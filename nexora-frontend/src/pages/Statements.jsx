import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DataTable } from '../components/ui/DataTable';

export default function Statements() {
  const [accountId, setAccountId] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });
  const accounts = Array.isArray(accountsData) ? accountsData : [];

  const { data: statementData, isLoading } = useQuery({
    queryKey: ['statements', accountId],
    queryFn: () => api.getStatements(accountId),
    enabled: !!accountId,
  });

  const columns = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (item) => (
        <span className="text-muted text-xs font-sans">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (item) => <span className="text-text font-medium">{item.description}</span>,
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (item) => (
        <span className={`border px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase tracking-wider ${
          item.type === 'CREDIT'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {item.type}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => (
        <span className="text-text font-bold font-mono">₦{item.amount.toLocaleString()}</span>
      ),
      sortable: true,
    },
    {
      header: 'Balance After',
      accessorKey: 'balanceAfter',
      cell: (item) => (
        <span className="text-muted font-mono">₦{item.balanceAfter.toLocaleString()}</span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">

      <div className="bg-panel border border-border p-6 rounded-xl shadow-sm shrink-0 flex items-end gap-4">
        <div className="flex-1 max-w-md space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
            Select Virtual Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm font-sans transition-colors"
          >
            <option value="">-- Choose Account --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} — {acc.accountNumber}
              </option>
            ))}
          </select>
        </div>

        {accountId && statementData && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted uppercase font-bold">Current Balance</p>
            <p className="text-2xl font-mono font-bold text-text">
              ₦{statementData.account?.balance?.toLocaleString() ?? '0'}
            </p>
          </div>
        )}
      </div>

      {accountId && (
        <DataTable
          columns={columns}
          data={statementData?.statement || []}
          isLoading={isLoading}
          searchKey="description"
          searchPlaceholder="Search by description..."
          emptyMessage="No ledger entries found for this account."
        />
      )}

      {!accountId && (
        <div className="p-16 text-center border border-dashed border-border rounded-xl text-muted text-sm bg-panel/30">
          Select a virtual account above to view its statement.
        </div>
      )}
    </div>
  );
}
