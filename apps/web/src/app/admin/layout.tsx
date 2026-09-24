'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { RoleName } from '@mercantix/contracts';
import {
  ShieldAlert,
  LayoutDashboard,
  Store,
  ShoppingBag,
  Activity,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Lock,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isAuthenticated, hasRole } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <Lock className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Restricted Admin Area</h2>
          <p className="text-sm text-slate-400 mb-6">
            Authentication is required to access the marketplace administration control panel.
          </p>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-block"
          >
            Sign In with Admin Account
          </Link>
        </div>
      </div>
    );
  }

  if (!hasRole(RoleName.ADMIN)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Unauthorized Access</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your current account (<span className="text-slate-200">{user?.email}</span>) does not possess the elevated <code className="text-amber-400">ADMIN</code> role.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition inline-block"
          >
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Vendor Approvals & KYC', href: '/admin/vendors', icon: Store },
    { label: 'All Platform Orders', href: '/admin/orders', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">Mercantix Admin</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-6 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2 text-xs">
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Outbox Worker:</span>
              <span className="font-bold text-emerald-400">ONLINE</span>
            </div>

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
                        ? 'bg-rose-600 text-white shadow-sm'
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

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          Superadmin Console v1.0
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
