export interface CartItemResponse {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImage?: string | null;
  vendorId: string;
  vendorName?: string;
  quantity: number;
  subtotal: number;
  isAvailable: boolean;
  availableStock: number;
}

export interface CartResponse {
  id: string;
  buyerId: string;
  items: CartItemResponse[];
  totalItems: number;
  subtotal: number;
  updatedAt: Date;
}

export interface WishlistItemResponse {
  id: string;
  wishlistId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImage?: string | null;
  isAvailable: boolean;
  addedAt: Date;
}

export interface WishlistResponse {
  id: string;
  userId: string;
  items: WishlistItemResponse[];
  totalItems: number;
}
