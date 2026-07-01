import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Key, Building, ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: api.me });

  const handleRegenerate = () => {
    toast.success('API key regenerated successfully.');
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in">

      <div className="space-y-6">

        {/* Merchant Profile */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-matte/30">
            <Building className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-text tracking-tight">
              Merchant Profile
            </h3>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Business Name
              </label>

              {isLoading ? (
                <div className="h-10 bg-border/50 rounded-lg animate-pulse"></div>
              ) : (
                <div className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg text-sm font-medium shadow-sm">
                  {me?.name}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Contact Email
              </label>

              {isLoading ? (
                <div className="h-10 bg-border/50 rounded-lg animate-pulse"></div>
              ) : (
                <div className="w-full px-4 py-2.5 bg-matte border border-border text-text rounded-lg text-sm font-medium shadow-sm">
                  {me?.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-matte/30">
            <Key className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-text tracking-tight">
              API Credentials
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Secret API Key
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {isLoading ? (
                  <div className="flex-1 h-10 w-full bg-border/50 rounded-lg animate-pulse"></div>
                ) : (
                  <div className="flex-1 w-full flex items-center bg-matte border border-border rounded-lg shadow-sm overflow-hidden">
                    <div className="flex-1 px-4 py-2.5 text-muted text-sm font-mono tracking-wider truncate">
                      {me?.apiKey}
                    </div>

                    <button
                      onClick={() => handleCopy(me?.apiKey || '', 'API Key')}
                      className="p-2.5 hover:bg-border/50 text-muted hover:text-text transition-colors border-l border-border cursor-pointer"
                      title="Copy API Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleRegenerate}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Key
                </button>
              </div>

              <p className="text-xs text-muted mt-2">
                Use this key to authenticate with the Nexora REST API.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Security */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-matte/30">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-text tracking-tight">
              Webhook Security
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                Webhook Secret
              </label>

              <div className="flex items-center bg-matte border border-border rounded-lg shadow-sm overflow-hidden max-w-md">
                <div className="flex-1 px-4 py-2.5 text-text text-sm font-mono tracking-wider">
                  NombaHackathon2026
                </div>

                <button
                  onClick={() =>
                    handleCopy('NombaHackathon2026', 'Webhook Secret')
                  }
                  className="p-2.5 hover:bg-border/50 text-muted hover:text-text transition-colors border-l border-border cursor-pointer"
                  title="Copy Webhook Secret"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted mt-2">
                Use this secret to verify the x-nomba-signature header.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}