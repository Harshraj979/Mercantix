'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { OrderItemResponse, OrderItemStatus, OrderResponse } from '@mercantix/contracts';
import {
  ShoppingBag,
  Truck,
  CheckCircle,
  Clock,
  Package,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  Send,
} from 'lucide-react';

export default function VendorOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Shipment fulfillment modal state
  const [selectedItem, setSelectedItem] = useState<OrderItemResponse | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderItemStatus>(OrderItemStatus.SHIPPED);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('Delhivery');
  const [updating, setUpdating] = useState(false);

  const loadOrders = async () => {
    if (!accessToken) return;
    try {
      const res = await apiClient<{ data: OrderResponse[] }>('/orders/vendor/me?limit=50', {
        token: accessToken,
      });
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load vendor orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [accessToken]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedItem) return;
    setUpdating(true);

    try {
      await apiClient(`/orders/items/${selectedItem.id}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          status: nextStatus,
          trackingNumber: trackingNumber || undefined,
          trackingCarrier: trackingCarrier || undefined,
        }),
      });

      setSelectedItem(null);
      setTrackingNumber('');
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to update fulfillment status');
    } finally {
      setUpdating(false);
    }
  };

  // Flatten orders into items for fulfillment tracking
  const allItems = orders.flatMap((order) =>
    order.orderItems.map((item) => ({
      ...item,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      orderCreatedAt: order.createdAt,
      orderStatus: order.status,
    }))
  );

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Fulfillment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review buyer orders, package line items, and submit shipment dispatch tracking.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order # or product name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Order Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-600">No fulfillment items found</p>
            <p className="text-xs text-slate-400 mt-1">
              New orders containing your products will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Order / Date</th>
                  <th className="px-6 py-3.5">Product Item</th>
                  <th className="px-6 py-3.5">Qty & Subtotal</th>
                  <th className="px-6 py-3.5">Fulfillment Status</th>
                  <th className="px-6 py-3.5">Tracking</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-slate-900">{item.orderNumber}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.orderCreatedAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 line-clamp-1">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        ₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} each
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{item.quantity} unit(s)</p>
                      <p className="font-bold text-slate-900">
                        ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.status === 'PACKED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : item.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.trackingNumber ? (
                        <div className="font-mono text-[11px]">
                          <p className="font-bold text-slate-800">{item.trackingNumber}</p>
                          <p className="text-slate-400">{item.trackingCarrier || 'Courier'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setNextStatus(
                              item.status === OrderItemStatus.PENDING
                                ? OrderItemStatus.ACCEPTED
                                : item.status === OrderItemStatus.ACCEPTED
                                ? OrderItemStatus.PACKED
                                : item.status === OrderItemStatus.PACKED
                                ? OrderItemStatus.SHIPPED
                                : OrderItemStatus.DELIVERED
                            );
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Update</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fulfillment Status Update Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Update Fulfillment Status</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-slate-500">Item:</p>
                <p className="text-sm font-bold text-slate-800">{selectedItem.productName || 'Order Product'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Status *</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderItemStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ACCEPTED">ACCEPTED (Acknowledge order)</option>
                  <option value="PACKED">PACKED (Ready for courier pickup)</option>
                  <option value="SHIPPED">SHIPPED (Handed to courier)</option>
                  <option value="DELIVERED">DELIVERED (Customer received)</option>
                  <option value="CANCELLED">CANCELLED (Out of stock)</option>
                </select>
              </div>

              {nextStatus === 'SHIPPED' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Carrier</label>
                    <input
                      type="text"
                      value={trackingCarrier}
                      onChange={(e) => setTrackingCarrier(e.target.value)}
                      placeholder="Delhivery / BlueDart / FedEx"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tracking Number / AWB</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="DEL1234567890"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {updating ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
