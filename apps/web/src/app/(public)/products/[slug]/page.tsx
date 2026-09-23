'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ProductResponse,
  ProductRatingSummaryResponse,
  ReviewResponse,
} from '@mercantix/contracts';
import { apiClient } from '@/lib/api-client';
import { useCartStore } from '@/store/use-cart-store';
import { useAuthStore } from '@/store/use-auth-store';
import {
  ShoppingCart,
  Check,
  Star,
  ShieldCheck,
  Truck,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [ratingSummary, setRatingSummary] =
    useState<ProductRatingSummaryResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      try {
        setIsLoading(true);
        const prod = await apiClient<ProductResponse>(`/products/slug/${slug}`);
        setProduct(prod);

        // Fetch ratings and reviews concurrently
        try {
          const [summary, reviewRes] = await Promise.all([
            apiClient<ProductRatingSummaryResponse>(
              `/reviews/product/${prod.id}/summary`,
            ),
            apiClient<{ data: ReviewResponse[] }>(
              `/reviews/product/${prod.id}`,
            ),
          ]);
          setRatingSummary(summary);
          setReviews(reviewRes.data || []);
        } catch {
          // Reviews might be empty
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!accessToken) {
      alert('Please sign in to add items to your cart.');
      return;
    }

    try {
      setIsAdding(true);
      await addItem(accessToken, product.id, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (err: any) {
      alert(err?.message || 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading product specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{error || 'Product not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Top Product Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].storageKey}
                alt={product.images[0].altText || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-slate-400 font-medium">No Image Provided</span>
            )}
          </div>
        </div>

        {/* Info & Buy Box */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                {product.categoryName || 'General Category'}
              </span>
              {product.vendorName && (
                <span className="text-xs font-medium text-slate-500">
                  Sold by <span className="font-semibold text-slate-800">{product.vendorName}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {product.name}
            </h1>

            {/* Rating summary */}
            {ratingSummary && ratingSummary.totalReviews > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(ratingSummary.averageRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-slate-700">
                  {ratingSummary.averageRating}
                </span>
                <span className="text-slate-400">
                  ({ratingSummary.totalReviews} reviews)
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No customer reviews yet</p>
            )}

            {/* Price */}
            <div className="pt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 ml-2">Inclusive of all taxes</span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-slate-600 leading-relaxed pt-2">
                {product.description}
              </p>
            )}
          </div>

          {/* Action Box */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            {/* Quantity */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Quantity:</label>
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-semibold"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart button */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition ${
                isAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="h-5 w-5" /> Added to Shopping Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" /> Add to Cart
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-slate-400" /> Free Shipping
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Authentic Guarantee
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Reviews Section */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Verified Customer Reviews</h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">
            Be the first verified purchaser to leave feedback on this item!
          </p>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    {rev.buyerEmail || 'Verified Buyer'}
                  </span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-sm text-slate-600">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
