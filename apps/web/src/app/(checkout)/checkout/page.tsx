'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useCartStore } from '@/store/use-cart-store';
import { apiClient } from '@/lib/api-client';
import {
  AddressResponse,
  OrderResponse,
  PaymentInitiationResponse,
  PaymentDetailsResponse,
} from '@mercantix/contracts';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon') || '';

  const accessToken = useAuthStore((state) => state.accessToken);
  const { cart, fetchCart, clearCart } = useCartStore();

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick address modal state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }

    fetchCart(accessToken);

    async function loadAddresses() {
      try {
        const res = await apiClient<AddressResponse[]>('/users/addresses', {
          token: accessToken!,
        });
        setAddresses(res);
        const defaultAddr = res.find((a) => a.isDefault) || res[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch {
        // May have no addresses yet
      }
    }

    loadAddresses();
  }, [accessToken, fetchCart, router]);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    try {
      const created = await apiClient<AddressResponse>('/users/addresses', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ ...newAddress, country: 'IN', isDefault: true }),
      });

      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or create a shipping address.');
      return;
    }
    if (!cart || cart.items.length === 0) {
      setError('Your shopping cart is empty.');
      return;
    }
    if (!accessToken) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Generate client idempotency key (UUID v4)
      const idempotencyKey = crypto.randomUUID();

      // 2. Checkout cart into an Order
      const order = await apiClient<OrderResponse>('/orders/checkout', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          couponCode: couponCode ? couponCode.trim().toUpperCase() : undefined,
          idempotencyKey,
        }),
      });

      // 3. Initiate Payment session
      const paymentAttemptKey = crypto.randomUUID();
      const initiation = await apiClient<PaymentInitiationResponse>(
        '/payments/initiate',
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            orderId: order.id,
            provider: 'RAZORPAY',
            idempotencyKey: paymentAttemptKey,
          }),
        },
      );

      // 4. Verify/Capture payment (Simulated gateway verification)
      await apiClient<PaymentDetailsResponse>('/payments/verify', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          orderId: order.id,
          providerReference: initiation.providerReference,
          signature: 'simulated_authorized_signature',
        }),
      });

      // 5. Clear local cart store
      await clearCart(accessToken);

      setCompletedOrder(order);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete order and payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Order Confirmed!</h1>
        <p className="text-sm text-slate-600">
          Thank you for your purchase. We have received your payment and our verified
          merchants are preparing your items.
        </p>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-bold text-slate-800 font-mono">{completedOrder.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-emerald-600">PAID & PROCESSING</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Paid:</span>
            <span className="font-bold text-slate-900">
              ₹{Number(completedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push('/products')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
        <p className="text-slate-600 text-sm mt-1">
          Complete your purchase securely with verified idempotency protection.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-2xl">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Shipping Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" /> Delivery Address
              </h2>
              <button
                onClick={() => setIsAddingAddress(!isAddingAddress)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add New Address
              </button>
            </div>

            {isAddingAddress && (
              <form onSubmit={handleCreateAddress} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                    className="text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone (10 digits)"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Address Line 1"
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="PIN Code"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="text-xs p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 && !isAddingAddress ? (
              <p className="text-xs text-slate-500">
                No delivery address saved. Please add a new delivery address above.
              </p>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`block p-4 rounded-xl border cursor-pointer transition ${
                      selectedAddressId === addr.id
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 text-blue-600"
                      />
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-slate-900">{addr.fullName}</span> ({addr.phone})
                        <p className="text-slate-600">
                          {addr.line1}, {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" /> Payment Gateway
            </h2>
            <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-900">
                  Razorpay / UPI / Card Payment
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                Encrypted & Verified
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Order Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-bold text-lg text-slate-900">Items Summary</h2>

          {cart && (
            <div className="space-y-3 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 line-clamp-1">
                      {item.productName}
                    </span>
                    <span className="text-slate-400">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Coupon summary */}
          {couponCode && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex justify-between">
              <span>Applied Coupon:</span>
              <span className="font-mono font-bold">{couponCode}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{(cart?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated GST (18%)</span>
              <span>₹{Math.round((cart?.subtotal || 0) * 0.18 * 100) / 100}</span>
            </div>
            <div className="flex justify-between text-slate-900 text-sm font-black pt-2 border-t border-slate-100">
              <span>Payable Total</span>
              <span>
                ₹{(
                  (cart?.subtotal || 0) +
                  Math.round((cart?.subtotal || 0) * 0.18 * 100) / 100
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing Atomic Checkout...
              </>
            ) : (
              'Authorize & Pay Now'
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Idempotency-protected transaction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
