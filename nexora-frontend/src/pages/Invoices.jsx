import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { DataTable } from '../components/ui/DataTable';
import { toast } from 'sonner';

export default function Invoices() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', amount: '', dueDate: '' });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: api.getInvoices
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers
  });

  const createMutation = useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCreating(false);
      setFormData({ customerId: '', amount: '', dueDate: '' });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invoice');
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  const columns = [
    {
      header: 'Reference',
      accessorKey: 'reference',
      cell: (item) => (
        <span className="font-mono text-xs text-muted tracking-wider">
          {item.reference}
        </span>
      ),
      sortable: true
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: (item) => (
        <span className="font-medium text-text">
          {item.customer?.firstName} {item.customer?.lastName}
        </span>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => (
        <span className="text-text font-mono font-bold">
          ₦{item.amount.toLocaleString()}
        </span>
      ),
      sortable: true
    },
    {
      header: 'Paid',
      accessorKey: 'amountPaid',
      cell: (item) => (
        <span className="text-muted font-mono">
          ₦{item.amountPaid.toLocaleString()}
        </span>
      ),
      sortable: true
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <span
          className={`border px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase ${
            item.status === 'PAID'
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700'
              : item.status === 'PARTIAL'
              ? 'bg-amber-50/50 border-amber-200 text-amber-700'
              : 'bg-border/50 border-border text-muted'
          }`}
        >
          {item.status}
        </span>
      ),
      sortable: true
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: (item) => (
        <span className="text-muted text-xs">
          {new Date(item.dueDate).toLocaleDateString()}
        </span>
      ),
      sortable: true
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-panel p-6 rounded-xl border border-border shadow-sm shrink-0"
        >
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Customer
              </label>

              <select
                value={formData.customerId}
                onChange={(e) =>
                  setFormData({ ...formData, customerId: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
                required
              >
                <option value="">-- Select --</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Amount (₦)
              </label>

              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Due Date
              </label>

              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors scheme-dark"
                required
              />
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 border border-border text-muted hover:text-text hover:border-border/80 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 text-xs uppercase tracking-wider shadow-sm cursor-pointer"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <DataTable
        columns={columns}
        data={invoices || []}
        isLoading={isLoading}
        searchKey="reference"
        searchPlaceholder="Search by reference..."
        emptyMessage="No invoices found."
      />
    </div>
  );
}