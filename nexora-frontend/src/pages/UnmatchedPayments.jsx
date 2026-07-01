import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";

export default function UnmatchedPayments() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('exceptions');

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['exceptions'],
    queryFn: api.getExceptions,
  });

  const safeExceptions = Array.isArray(exceptions) ? exceptions : [];

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['reconciliationReport'],
    queryFn: api.getReconciliationReport,
  });

  const resolveMutation = useMutation({
    mutationFn: api.resolveException,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      toast.success('Payment resolved successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to resolve payment');
    },
  });

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'date',
      label: 'Received',
      render: (val) => format(new Date(val), 'MMM d, yyyy'),
    },
    { key: 'sender', label: 'Sender' },
    {
      key: 'days',
      label: 'Aging',
      render: (val) => {
        const variant = val > 10 ? "error" : val > 5 ? "warning" : "neutral";
        return <Badge variant={variant}>{val} days</Badge>;
      },
    },
    {
      key: 'action',
      label: '',
      render: (_, row) =>
        !row.resolved ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => resolveMutation.mutate(row.id)}
            disabled={resolveMutation.isPending}
          >
            Match
          </Button>
        ) : (
          <Badge variant="success">Matched</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'exceptions' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('exceptions')}
          >
            Exceptions
          </Button>
          <Button
            variant={activeTab === 'report' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('report')}
          >
            Report
          </Button>
        </div>
      </div>

      {/* ALERT */}
      {activeTab === 'exceptions' && (
        <Card className="bg-amber-50/50 border-amber-200">
          <div className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-amber-600 shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>

            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                Manual Review Required
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                {safeExceptions.length} unmatched payments require attention
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* EXCEPTIONS TABLE */}
      {activeTab === 'exceptions' && (
        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text">
              Unmatched Payments
            </h2>
            <p className="text-xs text-muted">
              Payments that could not be automatically reconciled
            </p>
          </div>

          <Table
            columns={columns}
            data={safeExceptions}
          />
        </Card>
      )}

      {/* REPORT TAB (your stronger analytics layer) */}
      {activeTab === 'report' && (
        <div className="space-y-6">

          <Card>
            <h2 className="text-sm font-semibold text-text mb-4">
              Reconciliation Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted">Efficiency</p>
                <p className="text-lg font-semibold text-text">
                  {loadingReport ? '...' : `${report?.collectionEfficiency?.toFixed(1)}%`}
                </p>
              </div>

              <div>
                <p className="text-muted">Processed</p>
                <p className="text-lg font-semibold text-text">
                  {report?.totalProcessed}
                </p>
              </div>

              <div>
                <p className="text-muted">Matched</p>
                <p className="text-lg font-semibold text-green-500">
                  {report?.reconciledCount}
                </p>
              </div>

              <div>
                <p className="text-muted">Unmatched</p>
                <p className="text-lg font-semibold text-red-500">
                  {report?.unreconciledCount}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-text mb-3">
              Financial Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-muted">Total Volume</p>
                <p className="text-lg font-mono text-text">
                  ₦{report?.totalAmount?.toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-muted">Matched Value</p>
                <p className="text-lg font-mono text-green-500">
                  ₦{report?.reconciledAmount?.toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-muted">Exception Value</p>
                <p className="text-lg font-mono text-red-500">
                  ₦{report?.unreconciledAmount?.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

        </div>
      )}

    </div>
  );
}