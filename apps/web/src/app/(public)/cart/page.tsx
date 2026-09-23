'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/use-cart-store';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { CouponValidationResponse } from '@mercantix/contracts';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  Tag,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function CartPage() {
  const { cart, isLoading, fetchCart, updateQuantity, removeItem } =
    useCartStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] =
    useState<CouponValidationResponse | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchCart(accessToken);
    }
  }, [accessToken, fetchCart]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !cart) return;
    if (!accessToken) {
      alert('Please sign in to apply promotional coupons.');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await apiClient<CouponValidationResponse>(
        '/coupons/validate',
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            code: couponCode,
            subtotal: cart.subtotal,
          }),
        },
      );

      if (res.isValid) {
        setCouponResult(res);
      } else {
        setCouponError(res.message || 'Invalid coupon code');
        setCouponResult(null);
      }
    } catch (err: any) {
      setCouponError(err?.message || 'Failed to validate coupon');
      setCouponResult(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto space-y-4">
        <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Waiting</h2>
        <p className="text-sm text-slate-500">
          Sign in to view your items, sync across devices, and checkout with coupons.
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading && !cart) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Retrieving shopping cart...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto space-y-4">
        <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500">
          Explore our marketplace to discover verified seller items!
        </p>
        <Link
          href="/products"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const subtotal = cart.subtotal;
  const discountAmount = couponResult ? couponResult.discountAmount : 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableSubtotal * 0.18 * 100) / 100;
  const finalTotal = Math.round((taxableSubtotal + tax) * 100) / 100;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">
        Shopping Cart ({cart.items.length} item{cart.items.length > 1 ? 's' : ''})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm divide-y divide-slate-100">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No Image</span>
                  )}
                </div>
                <div>
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="font-bold text-slate-900 hover:text-blue-600 transition line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sold by {item.vendorName || 'Verified Merchant'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-2">
                    ₹{Number(item.productPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Quantity Controls & Remove */}
              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="flex items-center border border-slate-200 rounded-lg">
                  <button
                    onClick={() =>
                      updateQuantity(accessToken, item.productId, item.quantity - 1)
                    }
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-bold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(accessToken, item.productId, item.quantity + 1)
                    }
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(accessToken, item.productId)}
                  className="p-2 text-slate-400 hover:text-red-600 transition"
                  aria-label="Remove Item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Coupon Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>

          {/* Coupon Input Form */}
          <form onSubmit={handleApplyCoupon} className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-blue-600" /> Promotional Coupon
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SUMMER20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 uppercase text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isValidatingCoupon}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Apply
              </button>
            </div>

            {couponResult && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>{couponResult.message}</span>
              </div>
            )}

            {couponError && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                <span>{couponError}</span>
              </div>
            )}
          </form>

          {/* Price Breakdown */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Estimated Tax (18% GST)</span>
              <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="text-emerald-600 font-semibold">FREE</span>
            </div>

            <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-100">
              <span>Total Amount</span>
              <span>₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Link
            href={`/checkout${couponResult ? `?coupon=${couponResult.code}` : ''}`}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow transition"
          >
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
