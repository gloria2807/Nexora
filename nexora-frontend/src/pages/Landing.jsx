import React from 'react';
import { ArrowRight, ShieldCheck, Zap, BarChart3, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface text-text overflow-y-auto">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-primary via-primary-hover to-primary"></div>

        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center font-bold text-white shadow-sm">
              <span className="text-xl">N</span>
            </div>
            <span className="font-bold text-2xl tracking-tight text-text">
              NEXORA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted hover:text-text transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted hover:text-text transition-colors"
            >
              How it Works
            </a>
            <Link
              to="/dashboard"
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors shadow-sm"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-10 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-border text-primary text-sm font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Powered by Nomba API
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] text-text">
            Automated <span className="text-primary">Treasury</span> <br />
            & Reconciliation
          </h1>

          <p className="text-xl text-muted max-w-2xl leading-relaxed">
            Nexora leverages Nomba Dedicated Virtual Accounts to provide enterprise-grade collections, instant invoice matching, and seamless merchant payouts.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-sm flex items-center justify-center gap-3 text-lg"
            >
              Start Demo <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="https://docs.nomba.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-surface border border-border text-text rounded-xl font-bold hover:bg-border/40 transition-colors flex items-center justify-center gap-3 text-lg"
            >
              Read API Docs
            </a>
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <div className="absolute inset-0 bg-primary/10 blur-3xl -z-10 rounded-full aspect-square"></div>

          <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
              alt="Dashboard Preview"
              className="rounded-xl w-full h-auto opacity-90"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 px-6 bg-surface border-y border-border"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Enterprise Capabilities
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Built for scale, speed, and uncompromising accuracy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-8 rounded-2xl border border-border hover:border-primary/40 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-text">
                Instant Virtual Accounts
              </h3>
              <p className="text-muted leading-relaxed">
                Provision Nomba dedicated static accounts for your corporate clients in milliseconds via our robust API integration.
              </p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-border hover:border-primary/40 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-text">
                100% Secure Webhooks
              </h3>
              <p className="text-muted leading-relaxed">
                Cryptographically verified webhooks ensuring all inbound collections are authentic and tamper-proof.
              </p>
            </div>

            <div className="bg-surface p-8 rounded-2xl border border-border hover:border-primary/40 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-text">
                Smart Reconciliation
              </h3>
              <p className="text-muted leading-relaxed">
                Automated matching of incoming transfers to pending invoices, flagging overpayments and underpayments instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="py-24 px-6 max-w-7xl mx-auto space-y-16"
      >
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            How it Works
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Follow this simple tutorial to see Nexora in action.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Seed Demo Data', desc: 'Click "Seed Demo Data" on the dashboard to populate your workspace.' },
            { step: '2', title: 'Create Invoice', desc: 'Generate a pending invoice for a pre-configured corporate customer.' },
            { step: '3', title: 'Simulate Transfer', desc: 'Use the Transactions page to simulate an inbound transfer via Nomba.' },
            { step: '4', title: 'Auto-Reconcile', desc: 'Watch the system instantly match the payment and flip the invoice to Paid.' }
          ].map((item) => (
            <div
              key={item.step}
              className="relative p-6 rounded-2xl border border-border bg-surface"
            >
              <div className="text-5xl font-bold text-border absolute top-4 right-6 opacity-30">
                {item.step}
              </div>
              <h4 className="text-xl font-bold mb-2 mt-4 text-text relative z-10">
                {item.title}
              </h4>
              <p className="text-sm text-muted relative z-10">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center pt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-sm"
          >
            Enter Demo Environment <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center font-bold text-white">
              <span className="text-xs">N</span>
            </div>
            <span className="font-bold tracking-tight text-text">
              NEXORA
            </span>
          </div>

          <p className="text-sm text-muted">
            Hackathon Submission • Nomba Dedicated Virtual Accounts
          </p>
        </div>
      </footer>
    </div>
  );
}