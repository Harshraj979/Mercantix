import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, RefreshCw, ShoppingBag } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white p-8 sm:p-14 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Zap className="h-3.5 w-3.5 text-blue-400" /> Powered by High-Concurrency NestJS & Next.js 14
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Next-Gen Commerce, Built for Scale.
          </h1>
          <p className="text-lg text-slate-300">
            Discover thousands of authentic items from verified merchants. Featuring
            atomic zero-oversell checkout and real-time inventory synchronization.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition"
            >
              <ShoppingBag className="h-5 w-5" /> Shop Products
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold backdrop-blur-sm transition"
            >
              Sell on Mercantix <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Decorative ambient gradients */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Trust & Architecture Value Badges */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Verified Merchants</h3>
            <p className="text-sm text-slate-600 mt-1">
              Every seller undergoes automated KYC document and bank account verification before catalog approval.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Atomic Stock Reservation</h3>
            <p className="text-sm text-slate-600 mt-1">
              Zero overselling under flash sales backed by database optimistic concurrency locking.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Idempotent Payments</h3>
            <p className="text-sm text-slate-600 mt-1">
              Never double-billed during network disconnects thanks to UUID v4 idempotency keys.
            </p>
          </div>
        </div>
      </section>

      {/* Featured CTA Banner */}
      <section className="bg-slate-900 rounded-2xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to explore the marketplace?</h2>
          <p className="text-slate-400">
            Browse our catalog spanning electronics, fashion, lifestyle, and home goods.
          </p>
        </div>
        <Link
          href="/products"
          className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-6 py-3 rounded-xl shadow transition flex items-center gap-2 whitespace-nowrap"
        >
          View All Products <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
