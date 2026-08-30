import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ example: 'cart-item-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'cart-uuid-123' })
  cartId!: string;

  @ApiProperty({ example: 'prod-uuid-123' })
  productId!: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  productName!: string;

  @ApiProperty({ example: 'iphone-15-pro-max' })
  productSlug!: string;

  @ApiProperty({ example: 1199.99 })
  productPrice!: number;

  @ApiPropertyOptional({ example: 'uploads/products/iphone15.jpg' })
  productImage?: string | null;

  @ApiProperty({ example: 'vendor-uuid-123' })
  vendorId!: string;

  @ApiPropertyOptional({ example: 'Tech Haven Store' })
  vendorName?: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 2399.98 })
  subtotal!: number;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: 50 })
  availableStock!: number;
}

export class CartResponseDto {
  @ApiProperty({ example: 'cart-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'buyer-uuid-123' })
  buyerId!: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ example: 2 })
  totalItems!: number;

  @ApiProperty({ example: 2399.98 })
  subtotal!: number;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  updatedAt!: Date;
}

export class WishlistItemResponseDto {
  @ApiProperty({ example: 'wishlist-item-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'wishlist-uuid-123' })
  wishlistId!: string;

  @ApiProperty({ example: 'prod-uuid-123' })
  productId!: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  productName!: string;

  @ApiProperty({ example: 'iphone-15-pro-max' })
  productSlug!: string;

  @ApiProperty({ example: 1199.99 })
  productPrice!: number;

  @ApiPropertyOptional({ example: 'uploads/products/iphone15.jpg' })
  productImage?: string | null;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  addedAt!: Date;
}

export class WishlistResponseDto {
  @ApiProperty({ example: 'wishlist-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'user-uuid-123' })
  userId!: string;

  @ApiProperty({ type: [WishlistItemResponseDto] })
  items!: WishlistItemResponseDto[];

  @ApiProperty({ example: 1 })
  totalItems!: number;
}
