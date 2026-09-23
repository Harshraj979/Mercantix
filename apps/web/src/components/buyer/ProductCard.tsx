'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check } from 'lucide-react';
import { ProductResponse } from '@mercantix/contracts';
import { useCartStore } from '@/store/use-cart-store';
import { useAuthStore } from '@/store/use-auth-store';

interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const accessToken = useAuthStore((state) => state.accessToken);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert('Please sign in to add items to your cart.');
      return;
    }

    try {
      setIsAdding(true);
      await addItem(accessToken, product.id, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    } catch (err: any) {
      alert(err?.message || 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image Placeholder or First Image */}
        <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].storageKey}
              alt={product.images[0].altText || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <span className="text-gray-400 text-sm font-medium">No Image</span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="truncate">{product.categoryName || 'General'}</span>
            {product.vendorName && (
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium truncate max-w-[120px]">
                {product.vendorName}
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">
              ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Link>

      {/* Action button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${
            isAdded
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" /> Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
