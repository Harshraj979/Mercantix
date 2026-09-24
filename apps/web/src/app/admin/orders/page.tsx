'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { OrderResponse, OrderStatus } from '@mercantix/contracts';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Sliders,
  AlertCircle,
  Loader2,
  DollarSign,
  Package,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Status override modal state
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.PROCESSING);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!accessToken) return;
    try {
      const res = await apiClient<{ data: OrderResponse[] }>('/orders/admin/all?limit=50', {
        token: accessToken,
      });
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load platform orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [accessToken]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedOrder) return;
    setUpdating(true);
    setFeedback(null);

    try {
      await apiClient(`/orders/admin/${selectedOrder.id}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          status: newStatus,
          note: note || undefined,
        }),
      });

      setFeedback('Order status successfully updated by admin override.');
      await loadOrders();
      setSelectedOrder(null);
      setNote('');
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const orderNumber = `ORD-${o.id.slice(0, 8).toUpperCase()}`;
    const matchesSearch =
      orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Global Marketplace Orders</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect cross-vendor orders, tax and platform fee breakdowns, and administrative overrides.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
          {feedback}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID or buyer ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-400">No platform orders found</p>
            <p className="text-xs text-slate-500 mt-1">Customer orders will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Order ID / Date</th>
                  <th className="px-6 py-3.5">Buyer</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Subtotal / Fee</th>
                  <th className="px-6 py-3.5">Total Payable</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-white">
                        ORD-{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {order.buyerId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {order.orderItems.length} item(s)
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      ₹{order.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /{' '}
                      <span className="text-emerald-400">₹{order.platformFee} fee</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          order.status === OrderStatus.DELIVERED
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : order.status === OrderStatus.CANCELLED
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Override</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Order Status Override Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Order Status Override</h2>
                <p className="text-xs text-slate-400 font-mono">ORD-{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Line Items Snapshot */}
            <div className="py-4 border-b border-slate-800 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items:</p>
              <div className="space-y-2">
                {selectedOrder.orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{item.productName || 'Product'}</p>
                      <p className="text-[11px] text-slate-400">
                        Vendor: {item.vendorName || item.vendorId.slice(0, 8)} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-slate-200">
                      ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="pt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Order Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value={OrderStatus.PENDING_PAYMENT}>PENDING_PAYMENT</option>
                  <option value={OrderStatus.PAID}>PAID</option>
                  <option value={OrderStatus.PROCESSING}>PROCESSING</option>
                  <option value={OrderStatus.SHIPPED}>SHIPPED</option>
                  <option value={OrderStatus.DELIVERED}>DELIVERED</option>
                  <option value={OrderStatus.CANCELLED}>CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Log Note</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for administrative status override (e.g. buyer dispute resolution)..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {updating ? 'Updating...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
