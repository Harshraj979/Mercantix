'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import { AuthTokenResponse, RoleName } from '@mercantix/contracts';
import { Lock, Mail, Store, User, Loader2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleName>(RoleName.BUYER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient<AuthTokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });

      setAuth(response.user, response.accessToken);
      if (role === RoleName.VENDOR) {
        router.push('/vendor');
      } else {
        router.push('/products');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900">Create an Account</h1>
          <p className="text-sm text-slate-500">Join Mercantix as a buyer or verified seller</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole(RoleName.BUYER)}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                role === RoleName.BUYER
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs">Buyer Account</span>
            </button>

            <button
              type="button"
              onClick={() => setRole(RoleName.VENDOR)}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                role === RoleName.VENDOR
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className="h-5 w-5" />
              <span className="text-xs">Merchant / Seller</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password (Min. 8 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
