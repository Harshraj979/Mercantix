import { ProductStatus } from './enums';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: CategoryResponse[];
}

export interface ProductImageResponse {
  id: string;
  productId: string;
  storageKey: string;
  altText?: string | null;
  position: number;
}

export interface ProductVariantResponse {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, any>;
  price?: number | null;
  availableQuantity?: number;
  reservedQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductResponse {
  id: string;
  vendorId: string;
  vendorName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  description?: string | null;
  tags: string[];
  price: number;
  status: ProductStatus;
  availableQuantity?: number;
  reservedQuantity?: number;
  images: ProductImageResponse[];
  variants: ProductVariantResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResponse {
  data: ProductResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
