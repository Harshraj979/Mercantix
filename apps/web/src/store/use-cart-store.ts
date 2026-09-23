import { create } from 'zustand';
import { CartResponse, CartItemResponse } from '@mercantix/contracts';
import { apiClient } from '@/lib/api-client';

interface CartState {
  cart: CartResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchCart: (token: string) => Promise<void>;
  addItem: (token: string, productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (token: string, productId: string, quantity: number) => Promise<void>;
  removeItem: (token: string, productId: string) => Promise<void>;
  clearCart: (token: string) => Promise<void>;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiClient<CartResponse>('/cart', { token });
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch cart', isLoading: false });
    }
  },

  addItem: async (token: string, productId: string, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiClient<CartResponse>('/cart/items', {
        method: 'POST',
        token,
        body: JSON.stringify({ productId, quantity }),
      });
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to add item to cart', isLoading: false });
      throw err;
    }
  },

  updateQuantity: async (token: string, productId: string, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiClient<CartResponse>(`/cart/items/${productId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ quantity }),
      });
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update item quantity', isLoading: false });
      throw err;
    }
  },

  removeItem: async (token: string, productId: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiClient<CartResponse>(`/cart/items/${productId}`, {
        method: 'DELETE',
        token,
      });
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to remove item', isLoading: false });
      throw err;
    }
  },

  clearCart: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiClient<CartResponse>('/cart', {
        method: 'DELETE',
        token,
      });
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to clear cart', isLoading: false });
      throw err;
    }
  },

  getItemCount: () => {
    const cart = get().cart;
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  },
}));
