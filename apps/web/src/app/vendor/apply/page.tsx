'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { VendorResponse } from '@mercantix/contracts';
import {
  Store,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function VendorApplyPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Bank Form
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Document registration
  const [docType, setDocType] = useState('PAN_CARD');
  const [storageKey, setStorageKey] = useState('');

  const fetchProfile = async () => {
    if (!accessToken) return;
    try {
      const data = await apiClient<VendorResponse>('/vendors/me/profile', {
        token: accessToken,
      });
      setVendor(data);
      setStoreName(data.storeName || '');
      setSlug(data.slug || '');
      setDescription(data.description || '');
      if (data.bankAccount) {
        setAccountHolder(data.bankAccount.accountHolder || '');
        setBankName(data.bankAccount.bankName || '');
        setAccountNumber(data.bankAccount.accountNumber || '');
        setIfscCode(data.bankAccount.ifscCode || '');
      }
    } catch {
      // Profile does not exist yet (draft)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [accessToken]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await apiClient<VendorResponse>('/vendors/me', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ storeName, slug: slug || undefined, description }),
      });
      setVendor(created);
      setMessage({ text: 'Store profile registered successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to create store', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient('/vendors/me/bank-account', {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify({ accountHolder, bankName, accountNumber, ifscCode }),
      });
      await fetchProfile();
      setMessage({ text: 'Payout bank account saved successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to save bank account', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !storageKey) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient('/vendors/me/documents', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ documentType: docType, storageKey }),
      });
      setStorageKey('');
      await fetchProfile();
      setMessage({ text: 'KYC Document submitted!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to register document', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!accessToken) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await apiClient<VendorResponse>('/vendors/me/submit', {
        method: 'POST',
        token: accessToken,
      });
      setVendor(updated);
      setMessage({ text: 'Application submitted for admin review!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Submission failed. Ensure bank and KYC docs are added.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant Onboarding & KYC</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete your business verification and payout banking setup to sell on Mercantix.
        </p>
      </div>

      {/* Status banner */}
      {vendor && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            vendor.status === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : vendor.status === 'UNDER_REVIEW'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : vendor.status === 'REJECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {vendor.status === 'APPROVED' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className="text-sm font-bold">Current Status: {vendor.status}</p>
              <p className="text-xs opacity-90">
                {vendor.status === 'APPROVED'
                  ? 'Your store is active and verified to list products and fulfill orders.'
                  : vendor.status === 'UNDER_REVIEW'
                  ? 'Your application is being reviewed by the Mercantix compliance team.'
                  : 'Please complete all steps below and submit for verification.'}
              </p>
            </div>
          </div>
          {vendor.status === 'APPROVED' && (
            <button
              onClick={() => router.push('/vendor/dashboard')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
            >
              Open Dashboard
            </button>
          )}
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Step 1: Store Information */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 1: Store Details</h2>
            <p className="text-xs text-slate-500">Provide the public name and branding for your storefront.</p>
          </div>
        </div>

        <form onSubmit={handleCreateStore} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                disabled={Boolean(vendor)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="e.g. Apex Electronics"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Slug (URL Identifier)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={Boolean(vendor)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="apex-electronics"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Tagline</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={vendor?.status === 'UNDER_REVIEW'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
              placeholder="Tell buyers about your product specialty and quality guarantees..."
            />
          </div>

          {!vendor && (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              {submitting ? 'Registering...' : 'Register Store Profile'}
            </button>
          )}
        </form>
      </div>

      {/* Step 2: Payout Bank Account */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 2: Payout Bank Account</h2>
            <p className="text-xs text-slate-500">Earnings from order settlements are transferred to this account.</p>
          </div>
        </div>

        <form onSubmit={handleSaveBank} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name *</label>
              <input
                type="text"
                required
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                disabled={!vendor || vendor.status === 'UNDER_REVIEW'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="Full Legal Name / Entity Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={!vendor || vendor.status === 'UNDER_REVIEW'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="e.g. HDFC Bank, ICICI Bank"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={!vendor || vendor.status === 'UNDER_REVIEW'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="Bank Account Number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC / Routing Code *</label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                disabled={!vendor || vendor.status === 'UNDER_REVIEW'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50"
                placeholder="HDFC0001234"
              />
            </div>
          </div>

          {vendor && vendor.status !== 'UNDER_REVIEW' && (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition"
            >
              {submitting ? 'Saving...' : 'Save Bank Details'}
            </button>
          )}
        </form>
      </div>

      {/* Step 3: KYC Verification Documents */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 3: Verification Documents</h2>
            <p className="text-xs text-slate-500">Upload regulatory identification and business license credentials.</p>
          </div>
        </div>

        {/* Existing Documents List */}
        {vendor?.documents && vendor.documents.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Registered Documents:</p>
            <div className="space-y-2">
              {vendor.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">{doc.documentType}</span>
                    <span className="text-slate-400 font-mono">({doc.storageKey})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      doc.verificationStatus === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.verificationStatus === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {doc.verificationStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vendor && vendor.status !== 'UNDER_REVIEW' && (
          <form onSubmit={handleAddDocument} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="PAN_CARD">Permanent Account Number (PAN)</option>
                  <option value="GSTIN_CERTIFICATE">GSTIN Certificate</option>
                  <option value="INCORPORATION_CERTIFICATE">Certificate of Incorporation</option>
                  <option value="PASSPORT_OR_ID">Government Issued Photo ID</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Reference / Storage Key *</label>
                <input
                  type="text"
                  required
                  value={storageKey}
                  onChange={(e) => setStorageKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g. s3://mercantix-kyc/pan-ABCDE1234F.pdf"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition"
            >
              {submitting ? 'Registering...' : 'Add KYC Document'}
            </button>
          </form>
        )}
      </div>

      {/* Submission CTA */}
      {vendor && vendor.status === 'DRAFT' && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <h3 className="font-bold text-base">Ready for Marketplace Review?</h3>
            <p className="text-xs text-blue-200 mt-1">
              Once submitted, our compliance team reviews your documents within 24 business hours.
            </p>
          </div>
          <button
            onClick={handleSubmitForReview}
            disabled={submitting}
            className="px-6 py-3 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl text-sm flex items-center gap-2 shadow transition"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>Submit Application</span>
          </button>
        </div>
      )}
    </div>
  );
}
