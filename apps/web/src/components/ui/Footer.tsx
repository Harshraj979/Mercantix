import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              MERCANTIX
            </span>
            <p className="mt-3 text-sm text-gray-400">
              Next-generation multi-vendor commerce platform engineered for high
              concurrency, atomic checkout, and transparent merchant payouts.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Shop
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/products" className="hover:text-white transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition">
                  Featured Brands
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Vendors
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/register" className="hover:text-white transition">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="/vendor" className="hover:text-white transition">
                  Merchant Portal
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Platform
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li>Next.js 14 App Router</li>
              <li>NestJS Microservice API</li>
              <li>PostgreSQL & Prisma ORM</li>
              <li>Turborepo Monorepo</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Mercantix Technologies Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
