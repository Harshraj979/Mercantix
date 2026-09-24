'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { VendorResponse } from '@mercantix/contracts';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FileCheck2,
  Store,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !accessToken) {
      router.push('/login');
      return;
    }

    async function loadVendorProfile() {
      try {
        if (!accessToken) return;
        const profile = await apiClient<VendorResponse>('/vendors/me/profile', {
          token: accessToken,
        });
        setVendor(profile);
      } catch (err) {
        // Vendor profile might not exist yet if not applied
        setVendor(null);
      } finally {
        setLoading(false);
      }
    }

    loadVendorProfile();
  }, [isAuthenticated, accessToken, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span>Verifying merchant credentials...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Products & Stock', href: '/vendor/products', icon: Package },
    { label: 'Order Fulfillment', href: '/vendor/orders', icon: ShoppingBag },
    { label: 'KYC & Onboarding', href: '/vendor/apply', icon: FileCheck2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">Merchant Portal</h2>
              <p className="text-xs text-slate-400 truncate max-w-[140px]">
                {vendor?.storeName || user?.email || 'Merchant'}
              </p>
            </div>
          </div>

          <div className="p-4">
            {/* Status Card */}
            {vendor ? (
              <div className="mb-6 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Account Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      vendor.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : vendor.status === 'UNDER_REVIEW'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : vendor.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {vendor.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono">Commission: {vendor.commissionRate}%</p>
              </div>
            ) : (
              <div className="mb-6 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>KYC Incomplete. Complete onboarding to sell.</span>
              </div>
            )}

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Mercantix Certified Vendor</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
