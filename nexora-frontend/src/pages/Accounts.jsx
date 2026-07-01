import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Plus, Copy, CheckCircle2, MoreVertical,
  Pencil, Lock, Unlock, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ── Kebab menu ────────────────────────────────────────────────────
function AccountMenu({ account, onRename, onToggleFreeze, onClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isClosed = account.status === 'CLOSED';
  const isFrozen = account.status === 'FROZEN';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg hover:bg-border/50 text-muted hover:text-text transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-8 z-50 w-44 bg-white border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Rename — always available unless closed */}
            {!isClosed && (
              <button
                onClick={() => { setOpen(false); onRename(account); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text hover:bg-border/40 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </button>
            )}

            {/* Freeze / Unfreeze — only for ACTIVE or FROZEN */}
            {!isClosed && (
              <button
                onClick={() => { setOpen(false); onToggleFreeze(account); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text hover:bg-border/40 transition-colors cursor-pointer"
              >
                {isFrozen
                  ? <><Unlock className="w-3.5 h-3.5" /> Unfreeze</>
                  : <><Lock className="w-3.5 h-3.5" /> Freeze</>
                }
              </button>
            )}

            {/* Close — blocked for already-closed accounts */}
            {!isClosed && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setOpen(false); onClose(account); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Account
                </button>
              </>
            )}

            {/* Closed state — no actions */}
            {isClosed && (
              <div className="px-4 py-3 text-[10px] text-muted uppercase tracking-wider">
                Account is closed
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rename modal ──────────────────────────────────────────────────
function RenameModal({ account, onConfirm, onCancel, isPending }) {
  const [name, setName] = useState(account.accountName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
      >
        <div>
          <h3 className="font-bold text-text tracking-tight">Rename Account</h3>
          <p className="text-xs text-muted mt-1">
            The new name will appear on all future statements and records.
          </p>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
          autoFocus
        />

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel}
            className="px-5 py-2.5 border border-border text-muted hover:text-text rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name)}
            disabled={isPending || !name.trim() || name === account.accountName}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Close confirmation modal ──────────────────────────────────────
function CloseModal({ account, onConfirm, onCancel, isPending }) {
  const hasBalance = (account.balance || 0) > 0;
  const [force, setForce] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-text tracking-tight">Close Account</h3>
            <p className="text-xs text-muted mt-1">
              This will expire the NUBAN on Nomba. Any future transfers to this account
              number will be caught as exceptions.
            </p>
          </div>
        </div>

        {/* Balance warning */}
        {hasBalance && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Account has ₦{account.balance.toLocaleString()} balance
            </p>
            <p className="text-xs text-amber-700">
              Closing will leave this balance unswept. Tick below to close anyway.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
                className="rounded border-amber-300" />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Close with remaining balance
              </span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel}
            className="px-5 py-2.5 border border-border text-muted hover:text-text rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(force)}
            disabled={isPending || (hasBalance && !force)}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
          >
            {isPending ? 'Closing...' : 'Close Account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────
function StatusPill({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    FROZEN: 'bg-blue-50 border-blue-200 text-blue-700',
    CLOSED: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <span className={`border px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase ${styles[status] || 'border-border bg-matte text-muted'}`}>
      {status}
    </span>
  );
}

// ── Top accent colour per status ─────────────────────────────────
function accentColor(status) {
  if (status === 'FROZEN') return 'bg-blue-400';
  if (status === 'CLOSED') return 'bg-red-400';
  return 'bg-primary/60';
}

// ── Main page ─────────────────────────────────────────────────────
export default function Accounts() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ accountName: '', customerId: '' });
  const [copiedId, setCopiedId] = useState(null);

  // Modal state
  const [renameTarget, setRenameTarget] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  // ── Create ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsCreating(false);
      setFormData({ accountName: '', customerId: '' });
      toast.success('Virtual account created');
    },
    onError: (error) => toast.error(error.message || 'Failed to create account'),
  });

  // ── Rename ──────────────────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: ({ id, accountName }) => api.updateAccount(id, { accountName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setRenameTarget(null);
      toast.success('Account renamed');
    },
    onError: (error) => toast.error(error.message || 'Rename failed'),
  });

  // ── Freeze / Unfreeze ───────────────────────────────────────────
  const freezeMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateAccount(id, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(vars.status === 'FROZEN' ? 'Account frozen' : 'Account unfrozen');
    },
    onError: (error) => toast.error(error.message || 'Failed to update status'),
  });

  // ── Close ───────────────────────────────────────────────────────
  const closeMutation = useMutation({
    mutationFn: ({ id, force }) => api.closeAccount(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setCloseTarget(null);
      toast.success('Account closed');
    },
    onError: (error) => toast.error(error.message || 'Failed to close account'),
  });

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Account number copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleFreeze = (account) => {
    const newStatus = account.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    freezeMutation.mutate({ id: account.id, status: newStatus });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">

      {/* Modals */}
      {renameTarget && (
        <RenameModal
          account={renameTarget}
          onConfirm={(name) => renameMutation.mutate({ id: renameTarget.id, accountName: name })}
          onCancel={() => setRenameTarget(null)}
          isPending={renameMutation.isPending}
        />
      )}
      {closeTarget && (
        <CloseModal
          account={closeTarget}
          onConfirm={(force) => closeMutation.mutate({ id: closeTarget.id, force })}
          onCancel={() => setCloseTarget(null)}
          isPending={closeMutation.isPending}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white p-6 rounded-xl border border-border shadow-sm overflow-hidden shrink-0"
        >
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}
            className="flex gap-4 items-end flex-wrap"
          >
            <div className="flex-1 space-y-2 min-w-50">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Account Name
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="e.g. ACME CORP COLLECTIONS"
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
                required
              />
            </div>

            <div className="flex-1 space-y-2 min-w-50">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Link Customer (Optional)
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg focus:border-primary outline-none text-sm transition-colors"
              >
                <option value="">-- None --</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 border border-border text-muted hover:text-text rounded-lg transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending}
                className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 text-xs uppercase tracking-wider shadow-sm cursor-pointer">
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Account grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 h-55 animate-pulse">
              <div className="h-4 bg-border/50 rounded w-1/2 mb-2" />
              <div className="h-3 bg-border/50 rounded w-1/4 mb-6" />
              <div className="h-10 bg-border/50 rounded w-full mb-4" />
              <div className="h-8 bg-border/50 rounded w-1/3" />
            </div>
          ))
        ) : !accounts?.length ? (
          <div className="col-span-full p-16 text-center border border-dashed border-border rounded-xl text-muted text-sm bg-white/30">
            No virtual accounts yet. Create one to start receiving payments.
          </div>
        ) : (
          accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl border border-border shadow-sm flex flex-col relative overflow-hidden group transition-colors
                ${account.status === 'CLOSED' ? 'opacity-60' : 'hover:border-border/80'}
              `}
            >
              {/* Status accent bar */}
              <div className={`absolute top-0 left-0 w-full h-1 ${accentColor(account.status)} transition-colors`} />

              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-text tracking-tight truncate">
                      {account.accountName}
                    </h3>
                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">
                      {account.bankName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={account.status} />
                    <AccountMenu
                      account={account}
                      onRename={setRenameTarget}
                      onToggleFreeze={handleToggleFreeze}
                      onClose={setCloseTarget}
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">
                      Account Number
                    </p>
                    <div className="flex items-center justify-between bg-matte p-3 rounded-lg border border-border">
                      <p className="font-mono text-xl text-text font-bold tracking-widest">
                        {account.accountNumber}
                      </p>
                      <button
                        onClick={() => handleCopy(account.accountNumber, account.id)}
                        className="text-muted hover:text-text transition-colors p-1 cursor-pointer"
                      >
                        {copiedId === account.id
                          ? <CheckCircle2 className="w-5 h-5 text-text" />
                          : <Copy className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">
                      Available Balance
                    </p>
                    <p className="font-bold text-text font-mono text-2xl tracking-tight">
                      ₦{(account.balance || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Frozen notice */}
                  {account.status === 'FROZEN' && (
                    <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-200 rounded-lg px-3 py-2">
                      <Lock className="w-3 h-3 text-blue-600 shrink-0" />
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Account frozen — incoming payments will raise exceptions
                      </p>
                    </div>
                  )}

                  {/* Closed notice */}
                  {account.status === 'CLOSED' && (
                    <div className="flex items-center gap-2 bg-red-50/60 border border-red-200 rounded-lg px-3 py-2">
                      <X className="w-3 h-3 text-red-600 shrink-0" />
                      <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                        Account closed — NUBAN has been expired on Nomba
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-matte/80 text-[10px] text-muted flex justify-between items-center border-t border-border mt-auto">
                <span className="font-mono uppercase truncate max-w-40">REF: {account.reference}</span>
                <span className="font-bold uppercase tracking-wider shrink-0">
                  {account._count?.transactions || 0} TXNS
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
