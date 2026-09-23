'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Search, Store } from 'lucide-react';
import { useCartStore } from '@/store/use-cart-store';
import { useAuthStore } from '@/store/use-auth-store';

export function Navbar() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-black tracking-tight text-blue-600">
              MERCANTIX
            </span>
            <span className="hidden sm:inline-block text-xs uppercase px-2 py-0.5 font-semibold bg-blue-100 text-blue-800 rounded">
              Marketplace
            </span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products, brands, and categories..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Products link */}
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Catalog
            </Link>

            {/* Cart Link with Badge */}
            <Link
              href="/cart"
              className="relative p-2 text-gray-700 hover:text-blue-600 transition"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Auth status */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden lg:inline">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-red-600 hover:text-red-800 transition px-2 py-1 border border-red-200 rounded"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
