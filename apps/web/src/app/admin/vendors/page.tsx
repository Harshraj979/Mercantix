'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { DocumentStatus, VendorDocumentResponse, VendorResponse, VendorStatus } from '@mercantix/contracts';
import {
  Store,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  Search,
  Loader2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function AdminVendorsPage() {
  const { accessToken } = useAuthStore();
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review modal state
  const [selectedVendor, setSelectedVendor] = useState<VendorResponse | null>(null);
  const [newStatus, setNewStatus] = useState<VendorStatus>(VendorStatus.APPROVED);
  const [commissionRate, setCommissionRate] = useState<string>('10');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadVendors = async () => {
    if (!accessToken) return;
    try {
      const res = await apiClient<{ data: VendorResponse[] }>('/vendors/admin/all?limit=50', {
        token: accessToken,
      });
      if (res?.data) {
        setVendors(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [accessToken]);

  const handleUpdateVendorStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedVendor) return;
    setUpdating(true);
    setFeedback(null);

    try {
      await apiClient(`/vendors/admin/${selectedVendor.id}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          status: newStatus,
          commissionRate: parseFloat(commissionRate) || 10,
        }),
      });

      setFeedback('Vendor status and commission rate successfully updated.');
      await loadVendors();
      setSelectedVendor(null);
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to update vendor status');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyDoc = async (docId: string, status: DocumentStatus) => {
    if (!accessToken) return;
    try {
      await apiClient(`/vendors/admin/documents/${docId}/verify`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({ verificationStatus: status }),
      });

      // Update local state
      if (selectedVendor && selectedVendor.documents) {
        const updatedDocs = selectedVendor.documents.map((d) =>
          d.id === docId ? { ...d, verificationStatus: status } : d
        );
        setSelectedVendor({ ...selectedVendor, documents: updatedDocs });
      }
      await loadVendors();
    } catch (err: any) {
      alert(err?.message || 'Failed to update document verification');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Merchant Approvals & KYC</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review business registration licenses, inspect bank accounts, and approve merchant stores.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
          {feedback}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by store name or slug..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-400">No merchant stores found</p>
            <p className="text-xs text-slate-500 mt-1">
              Applications submitted by users will appear here for review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Store / Brand</th>
                  <th className="px-6 py-3.5">Commission</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">KYC Docs</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{vendor.storeName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">/{vendor.slug}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-200">
                      {vendor.commissionRate}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          vendor.status === VendorStatus.APPROVED
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : vendor.status === VendorStatus.UNDER_REVIEW
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : vendor.status === VendorStatus.REJECTED
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {vendor.documents?.length || 0} document(s)
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setNewStatus(vendor.status);
                          setCommissionRate(String(vendor.commissionRate));
                        }}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <span>Inspect & Decide</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & KYC Decision Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Merchant Application Review</h2>
                <p className="text-xs text-slate-400">{selectedVendor.storeName} ({selectedVendor.slug})</p>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Payout Banking Details */}
            <div className="py-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-400" />
                <span>Payout Bank Account</span>
              </h3>
              {selectedVendor.bankAccount ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Account Holder:</span>
                    <p className="font-semibold text-slate-200">{selectedVendor.bankAccount.accountHolder}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank:</span>
                    <p className="font-semibold text-slate-200">{selectedVendor.bankAccount.bankName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Account Number:</span>
                    <p className="font-mono text-slate-200">{selectedVendor.bankAccount.accountNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">IFSC Code:</span>
                    <p className="font-mono text-slate-200">{selectedVendor.bankAccount.ifscCode}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No bank account registered yet.</p>
              )}
            </div>

            {/* Verification Documents */}
            <div className="py-4 border-b border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Uploaded Regulatory Documents</span>
              </h3>

              {(!selectedVendor.documents || selectedVendor.documents.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No KYC documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedVendor.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{doc.documentType}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{doc.storageKey}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.verificationStatus === DocumentStatus.VERIFIED
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : doc.verificationStatus === DocumentStatus.REJECTED
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleVerifyDoc(doc.id, DocumentStatus.VERIFIED)}
                          className="p-1 hover:bg-slate-800 rounded text-emerald-400"
                          title="Mark Verified"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDoc(doc.id, DocumentStatus.REJECTED)}
                          className="p-1 hover:bg-slate-800 rounded text-rose-400"
                          title="Mark Rejected"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Application Decision Form */}
            <form onSubmit={handleUpdateVendorStatus} className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Set Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as VendorStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value={VendorStatus.APPROVED}>APPROVED (Allow active selling)</option>
                    <option value={VendorStatus.UNDER_REVIEW}>UNDER_REVIEW (Hold for more docs)</option>
                    <option value={VendorStatus.SUSPENDED}>SUSPENDED (Freeze listings)</option>
                    <option value={VendorStatus.REJECTED}>REJECTED (Deny application)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Commission Rate (%) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {updating ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
