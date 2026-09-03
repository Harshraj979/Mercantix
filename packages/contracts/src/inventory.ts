export interface InventoryResponse {
  productId: string;
  productName?: string;
  productSlug?: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  version: number;
}

export interface VariantInventoryResponse {
  variantId: string;
  sku?: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  version: number;
}

export interface LowStockItemResponse {
  productId: string;
  productName: string;
  sku?: string;
  availableQuantity: number;
  reservedQuantity: number;
  threshold: number;
}
