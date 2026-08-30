import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@mercantix/contracts';

export class CategoryResponseDto {
  @ApiProperty({ example: 'cat-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'Smartphones' })
  name!: string;

  @ApiProperty({ example: 'smartphones' })
  slug!: string;

  @ApiPropertyOptional({ example: 'parent-cat-uuid' })
  parentId?: string | null;

  @ApiPropertyOptional({ type: () => [CategoryResponseDto] })
  children?: CategoryResponseDto[];
}

export class ProductImageResponseDto {
  @ApiProperty({ example: 'img-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'prod-uuid-123' })
  productId!: string;

  @ApiProperty({ example: 'uploads/products/iphone15_front.jpg' })
  storageKey!: string;

  @ApiPropertyOptional({ example: 'Front view' })
  altText?: string | null;

  @ApiProperty({ example: 0 })
  position!: number;
}

export class ProductVariantResponseDto {
  @ApiProperty({ example: 'var-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'prod-uuid-123' })
  productId!: string;

  @ApiProperty({ example: 'IPHONE15-PRO-256-BLK' })
  sku!: string;

  @ApiProperty({ example: { storage: '256GB', color: 'Black Titanium' } })
  attributes!: Record<string, any>;

  @ApiPropertyOptional({ example: 1299.99 })
  price?: number | null;

  @ApiPropertyOptional({ example: 50 })
  availableQuantity?: number;

  @ApiPropertyOptional({ example: 0 })
  reservedQuantity?: number;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  updatedAt!: Date;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'prod-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'vendor-uuid-123' })
  vendorId!: string;

  @ApiPropertyOptional({ example: 'Tech Haven Store' })
  vendorName?: string;

  @ApiProperty({ example: 'cat-uuid-123' })
  categoryId!: string;

  @ApiPropertyOptional({ example: 'Smartphones' })
  categoryName?: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  name!: string;

  @ApiProperty({ example: 'iphone-15-pro-max' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Flagship smartphone featuring aerospace-grade titanium...' })
  description?: string | null;

  @ApiProperty({ example: ['apple', 'smartphone', 'flagship'] })
  tags!: string[];

  @ApiProperty({ example: 1199.99 })
  price!: number;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @ApiPropertyOptional({ example: 100 })
  availableQuantity?: number;

  @ApiPropertyOptional({ example: 0 })
  reservedQuantity?: number;

  @ApiProperty({ type: [ProductImageResponseDto] })
  images!: ProductImageResponseDto[];

  @ApiProperty({ type: [ProductVariantResponseDto] })
  variants!: ProductVariantResponseDto[];

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  updatedAt!: Date;
}
