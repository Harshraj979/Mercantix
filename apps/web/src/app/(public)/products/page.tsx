'use client';

import React, { useEffect, useState } from 'react';
import { ProductResponse, ProductListResponse } from '@mercantix/contracts';
import { ProductCard } from '@/components/buyer/ProductCard';
import { apiClient } from '@/lib/api-client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const response = await apiClient<ProductListResponse>('/products');
        setProducts(response.data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Product Catalog
        </h1>
        <p className="text-slate-600 mt-1">
          Explore authentic items from verified sellers across India.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <p className="text-slate-600 font-medium">No products found in the catalog yet.</p>
          <p className="text-sm text-slate-400 mt-1">Check back later or register as a seller to publish items!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
