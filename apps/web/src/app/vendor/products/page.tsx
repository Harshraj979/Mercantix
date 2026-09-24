'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { CategoryResponse, ProductResponse, ProductStatus } from '@mercantix/contracts';
import {
  Package,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Tag,
  Layers,
} from 'lucide-react';

export default function VendorProductsPage() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New product form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [description, setDescription] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const loadData = async () => {
    if (!accessToken) return;
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient<{ data: ProductResponse[] }>('/products/vendor/me?limit=50', { token: accessToken }),
        apiClient<CategoryResponse[]>('/categories'),
      ]);
      if (prodRes?.data) setProducts(prodRes.data);
      if (catRes) {
        setCategories(catRes);
        if (catRes.length > 0 && !categoryId) {
          setCategoryId(catRes[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load vendor products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !categoryId) return;
    setSubmitting(true);
    setFeedback(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const images = imageKey
      ? [{ storageKey: imageKey, altText: name, position: 0 }]
      : [];

    try {
      await apiClient('/products', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          name,
          categoryId,
          price: parseFloat(price),
          stock: parseInt(stock, 10) || 0,
          description: description || undefined,
          tags,
          images,
        }),
      });

      setFeedback({ text: 'Product created successfully!', type: 'success' });
      setIsModalOpen(false);
      // Reset form
      setName('');
      setPrice('');
      setDescription('');
      setImageKey('');
      setTagsInput('');
      await loadData();
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Failed to create product', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: ProductResponse) => {
    if (!accessToken) return;
    const newStatus: ProductStatus =
      product.status === ProductStatus.ACTIVE ? ProductStatus.DRAFT : ProductStatus.ACTIVE;
    try {
      await apiClient(`/products/${product.id}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({ status: newStatus }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product listing?')) return;
    if (!accessToken) return;
    try {
      await apiClient(`/products/${productId}`, {
        method: 'DELETE',
        token: accessToken,
      });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog & Stock</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your store inventory, SKU pricing, and visibility status.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Product</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by title or category..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-600">No products found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? 'Try adjusting your search query.' : 'Click "New Product" to add your first item.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Inventory</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0].storageKey}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{product.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.categoryName || 'General'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">
                        {product.availableQuantity ?? 0} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                          product.status === ProductStatus.ACTIVE
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {product.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Listing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add New Marketplace Listing</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1999.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock Count *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL / Storage Key</label>
                  <input
                    type="text"
                    value={imageKey}
                    onChange={(e) => setImageKey(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="audio, bluetooth, anc, electronics"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Highlight key specs, materials, warranty, and package contents..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  {submitting ? 'Creating...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
