'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { OrderItemStatus, OrderResponse, ProductResponse, VendorResponse } from '@mercantix/contracts';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle,
  Truck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function VendorDashboardPage() {
  const { accessToken } = useAuthStore();
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    async function loadDashboardData() {
      try {
        const [vendorRes, prodRes, ordRes] = await Promise.all([
          apiClient<VendorResponse>('/vendors/me/profile', { token: accessToken! }).catch(() => null),
          apiClient<{ data: ProductResponse[] }>('/products/vendor/me?limit=10', { token: accessToken! }).catch(() => ({ data: [] })),
          apiClient<{ data: OrderResponse[] }>('/orders/vendor/me?limit=10', { token: accessToken! }).catch(() => ({ data: [] })),
        ]);

        if (vendorRes) setVendor(vendorRes);
        if (prodRes?.data) setProducts(prodRes.data);
        if (ordRes?.data) setOrders(ordRes.data);
      } catch (err) {
        console.error('Failed to load vendor dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calculate high-level stats
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  
  // Calculate total gross revenue for orders
  const grossSales = orders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  const pendingFulfillments = orders.flatMap((o) => o.orderItems).filter(
    (item) =>
      item.status === OrderItemStatus.PENDING ||
      item.status === OrderItemStatus.ACCEPTED ||
      item.status === OrderItemStatus.PACKED
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {vendor?.storeName || 'Merchant'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Store performance metrics, catalog overview, and pending shipments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Link>
          <Link
            href="/vendor/orders"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Truck className="h-4 w-4" />
            <span>Fulfill Orders</span>
          </Link>
        </div>
      </div>

      {/* KYC Warning if not approved */}
      {vendor && vendor.status !== 'APPROVED' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Store Verification Status: {vendor.status}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {vendor.status === 'UNDER_REVIEW'
                  ? 'Your store is currently under review by compliance. You can prepare catalog listings in draft mode.'
                  : 'Complete your KYC documents and banking setup to publish active products.'}
              </p>
            </div>
          </div>
          <Link
            href="/vendor/apply"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
          >
            View KYC
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              ₹{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all order items</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Listings</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{activeProducts}</p>
            <p className="text-xs text-slate-400 mt-1">{totalProducts} total in catalog</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Shipments</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{pendingFulfillments}</p>
            <p className="text-xs text-amber-600 font-semibold mt-1">Requires packaging or dispatch</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Commission Rate</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{vendor?.commissionRate || 10}%</p>
            <p className="text-xs text-slate-400 mt-1">Platform settlement fee</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Customer Orders</h2>
            <p className="text-xs text-slate-500">Incoming purchase orders containing your merchandise.</p>
          </div>
          <Link
            href="/vendor/orders"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No customer orders placed yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Order Number</th>
                  <th className="px-6 py-3">Items Sold</th>
                  <th className="px-6 py-3">Total Payable</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Placed Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      ORD-{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {order.orderItems.length} product(s)
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/vendor/orders"
                        className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                      >
                        Manage
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
