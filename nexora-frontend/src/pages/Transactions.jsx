import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import { DataTable } from '../components/ui/DataTable';
import { toast } from 'sonner';

export default function Transactions() {
  const queryClient = useQueryClient();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedRef, setSelectedRef] = useState('');
  const [amount, setAmount] = useState('10000');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getTransactions,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const simulateMutation = useMutation({
    mutationFn: api.simulateTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      setIsSimulating(false);
      setSelectedRef('');

      toast.success('Transfer simulated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Simulation failed');
    },
  });

  const handleSimulate = (e) => {
    e.preventDefault();
    if (!selectedRef || !amount) return;

    simulateMutation.mutate({
      accountReference: selectedRef,
      amount: parseFloat(amount),
    });
  };

  const columns = [
    {
      header: 'Reference',
      accessorKey: 'reference',
      cell: (item) => (
        <span className="text-muted font-mono text-xs tracking-wider">
          {item.reference}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (item) => (
        <span className="text-muted text-xs">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Account',
      accessorKey: 'virtualAccount',
      cell: (item) => (
        <div>
          <p className="text-text font-medium">
            {item.virtualAccount?.accountName || 'N/A'}
          </p>
          <p className="text-[10px] text-muted font-mono mt-0.5">
            {item.virtualAccount?.accountNumber || ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => (
        <span className="text-text font-bold font-mono">
          ₦{item.amount.toLocaleString()}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <span className="text-text border border-border bg-matte px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase tracking-wider">
          {item.status}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className="flex items-center justify-center gap-2 bg-surface hover:bg-border border border-border text-text px-4 py-2.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          <Play className="w-4 h-4" />
          Simulate Webhook
        </button>
      </div>

      {isSimulating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-surface border border-border p-6 rounded-xl shadow-sm shrink-0 space-y-4"
        >
          <div>
            <h3 className="font-semibold text-text text-sm">
              Simulate Nomba Transfer
            </h3>
            <p className="text-xs text-muted mt-1">
              Test the reconciliation engine by mocking an inbound webhook.
            </p>
          </div>

          <form onSubmit={handleSimulate} className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2 flex-1 min-w-50">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Target Account Reference
              </label>

              <select
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
                required
              >
                <option value="">-- Choose Account --</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.reference}>
                    {acc.accountName} - {acc.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 w-48">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Amount (₦)
              </label>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
                min="100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={simulateMutation.isPending || !selectedRef}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              {simulateMutation.isPending ? 'Sending...' : 'Dispatch'}
            </button>
          </form>
        </motion.div>
      )}

      <DataTable
        columns={columns}
        data={transactions || []}
        isLoading={isLoading}
        searchKey="reference"
        searchPlaceholder="Search by reference..."
        emptyMessage="No transactions found."
      />
    </div>
  );
}