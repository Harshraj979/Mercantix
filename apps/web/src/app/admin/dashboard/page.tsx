'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { OrderResponse, VendorResponse, VendorStatus } from '@mercantix/contracts';
import {
  DollarSign,
  Store,
  ShoppingBag,
  Activity,
  RotateCw,
  ArrowUpRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface OutboxStats {
  pending: number;
  deadLetter: number;
  totalProcessed?: number;
}

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [outboxStats, setOutboxStats] = useState<OutboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken) return;
    try {
      const [ordRes, venRes, outboxRes] = await Promise.all([
        apiClient<{ data: OrderResponse[]; meta: { total: number } }>('/orders/admin/all?limit=10', {
          token: accessToken,
        }).catch(() => ({ data: [], meta: { total: 0 } })),
        apiClient<{ data: VendorResponse[]; meta: { total: number } }>('/vendors/admin/all?limit=50', {
          token: accessToken,
        }).catch(() => ({ data: [], meta: { total: 0 } })),
        apiClient<OutboxStats>('/admin/outbox/stats', {
          token: accessToken,
        }).catch(() => null),
      ]);

      if (ordRes?.data) setOrders(ordRes.data);
      if (venRes?.data) setVendors(venRes.data);
      if (outboxRes) setOutboxStats(outboxRes);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const handleFlushOutbox = async () => {
    if (!accessToken) return;
    setFlushing(true);
    setFlushMessage(null);
    try {
      const res = await apiClient<{ processed: number; failed: number }>('/admin/outbox/flush', {
        method: 'POST',
        token: accessToken,
      });
      setFlushMessage(`Outbox flushed: ${res.processed} processed, ${res.failed} failed.`);
      await loadData();
    } catch (err: any) {
      setFlushMessage(err?.message || 'Failed to flush outbox events');
    } finally {
      setFlushing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
      </div>
    );
  }

  // Calculate platform metrics
  const platformGMV = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingVendors = vendors.filter(
    (v) => v.status === VendorStatus.UNDER_REVIEW || v.status === VendorStatus.SUBMITTED
  ).length;
  const approvedVendors = vendors.filter((v) => v.status === VendorStatus.APPROVED).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Marketplace Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform GMV, merchant compliance governance, and transactional outbox telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFlushOutbox}
            disabled={flushing}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
          >
            <RotateCw className={`h-4 w-4 ${flushing ? 'animate-spin' : ''}`} />
            <span>Flush Outbox Queue</span>
          </button>
          <Link
            href="/admin/vendors"
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Store className="h-4 w-4" />
            <span>Review Applications ({pendingVendors})</span>
          </Link>
        </div>
      </div>

      {flushMessage && (
        <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
          {flushMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform GMV</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">
              ₹{platformGMV.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all vendor transactions</p>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Merchants</span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">{approvedVendors}</p>
            <p className="text-xs text-slate-400 mt-1">{vendors.length} total registered</p>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending KYC Review</span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">{pendingVendors}</p>
            <p className="text-xs text-amber-400 font-semibold mt-1">Awaiting compliance verification</p>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outbox Events</span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white">
              {outboxStats?.pending ?? 0} <span className="text-xs font-normal text-slate-400">pending</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {outboxStats?.deadLetter ?? 0} dead-letter retries
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Platform Orders</h2>
            <p className="text-xs text-slate-400">Live order stream across all customer checkouts.</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No transactions registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Buyer ID</th>
                  <th className="px-6 py-3">Total Payable</th>
                  <th className="px-6 py-3">Platform Fee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Placed Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-mono font-bold text-slate-200">
                      ORD-{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {order.buyerId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      ₹{order.platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/admin/orders"
                        className="text-rose-400 hover:text-rose-300 font-bold hover:underline"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
