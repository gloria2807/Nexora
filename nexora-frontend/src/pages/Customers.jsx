// pages/Customers.jsx
// Edge cases surfaced:
//   - KYC upgrade: PATCH /api/customers/:id { bvn } → kycTier bumped to 2
//   - Duplicate email: backend returns 409, shown via toast
//   - Tier 1 vs Tier 2 visually distinct in the table

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, ShieldCheck, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DataTable } from '../components/ui/DataTable';
import { toast } from 'sonner';

// ── KYC upgrade modal ─────────────────────────────────────────────
function KycUpgradeModal({ customer, onConfirm, onCancel, isPending }) {
  const [bvn, setBvn] = useState('');
  const valid = bvn.replace(/\D/g, '').length === 11;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-text tracking-tight">
              Upgrade {customer.firstName} to Tier 2
            </h3>
            <p className="text-xs text-muted mt-1">
              Adding a BVN links this customer's bank identity and unlocks higher transaction limits.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
            Bank Verification Number (BVN)
          </label>
          <input
            type="text"
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11-digit BVN"
            className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm font-mono tracking-widest transition-colors"
            autoFocus
          />
          {bvn && !valid && (
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
              BVN must be exactly 11 digits
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel}
            className="px-5 py-2.5 border border-border text-muted hover:text-text rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(bvn)}
            disabled={isPending || !valid}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
          >
            {isPending ? 'Upgrading...' : 'Upgrade to Tier 2'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── KYC Tier badge ────────────────────────────────────────────────
function KycBadge({ tier, onClick }) {
  if (tier === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
        <ShieldCheck className="w-3 h-3" />
        Tier 2
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      title="Click to upgrade KYC to Tier 2"
      className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors cursor-pointer"
    >
      <Shield className="w-3 h-3" />
      Tier 1 — Upgrade
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Customers() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', bvn: '',
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  // ── Create customer ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreating(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', bvn: '' });
      toast.success('Customer created successfully');
    },
    onError: (error) => toast.error(error.message || 'Failed to create customer'),
  });

  // ── KYC upgrade ─────────────────────────────────────────────────
  const upgradeMutation = useMutation({
    mutationFn: ({ id, bvn }) => api.updateCustomer(id, { bvn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setUpgradeTarget(null);
      toast.success('Customer upgraded to KYC Tier 2');
    },
    onError: (error) => toast.error(error.message || 'KYC upgrade failed'),
  });

  const columns = [
    {
      header: 'Name',
      accessorKey: 'firstName',
      cell: (item) => (
        <div>
          <p className="font-semibold text-text">{item.firstName} {item.lastName}</p>
          <p className="text-[10px] text-muted font-mono tracking-wider">{item.id}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Contact',
      accessorKey: 'email',
      cell: (item) => (
        <div>
          <p className="text-text text-sm">{item.email}</p>
          <p className="text-xs text-muted">{item.phone}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'KYC Tier',
      accessorKey: 'kycTier',
      cell: (item) => (
        <KycBadge
          tier={item.kycTier}
          onClick={() => setUpgradeTarget(item)}
        />
      ),
      sortable: true,
    },
    {
      header: 'Joined',
      accessorKey: 'createdAt',
      cell: (item) => (
        <span className="text-muted text-xs">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">

      {/* KYC upgrade modal */}
      {upgradeTarget && (
        <KycUpgradeModal
          customer={upgradeTarget}
          onConfirm={(bvn) => upgradeMutation.mutate({ id: upgradeTarget.id, bvn })}
          onCancel={() => setUpgradeTarget(null)}
          isPending={upgradeMutation.isPending}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 bg-gold hover:bg-yellow-500 text-matte px-4 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-xl border border-border shadow-sm shrink-0 overflow-hidden"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {[
                { label: 'First Name', key: 'firstName', type: 'text', required: true },
                { label: 'Last Name',  key: 'lastName',  type: 'text', required: true },
                { label: 'Email',      key: 'email',     type: 'email', required: true },
                { label: 'Phone',      key: 'phone',     type: 'tel',  required: true },
              ].map(({ label, key, type, required }) => (
                <div key={key} className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-gold outline-none text-sm transition-colors"
                    required={required}
                  />
                </div>
              ))}

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                  BVN <span className="text-muted font-normal normal-case tracking-normal">— Optional, upgrades to Tier 2</span>
                </label>
                <input
                  type="text"
                  value={formData.bvn}
                  onChange={(e) => setFormData({ ...formData, bvn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-gold outline-none text-sm font-mono tracking-widest transition-colors"
                  placeholder="11 digits"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 border border-border text-muted hover:text-text rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="px-5 py-2.5 bg-gold text-matte rounded-lg font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 text-xs uppercase tracking-wider shadow-sm cursor-pointer">
                  {createMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        columns={columns}
        data={customers || []}
        isLoading={isLoading}
        searchKey="email"
        searchPlaceholder="Search by email..."
        emptyMessage="No customers found. Add your first customer."
      />
    </div>
  );
}
