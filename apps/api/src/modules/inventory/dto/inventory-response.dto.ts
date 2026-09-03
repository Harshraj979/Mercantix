import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryResponse,
  VariantInventoryResponse,
  LowStockItemResponse,
} from '@mercantix/contracts';

export class InventoryResponseDto implements InventoryResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  productId!: string;

  @ApiPropertyOptional({ example: 'Sony WH-1000XM5' })
  productName?: string;

  @ApiPropertyOptional({ example: 'sony-wh-1000xm5' })
  productSlug?: string;

  @ApiProperty({ example: 45 })
  availableQuantity!: number;

  @ApiProperty({ example: 5 })
  reservedQuantity!: number;

  @ApiProperty({ example: 50 })
  totalQuantity!: number;

  @ApiProperty({ example: 12 })
  version!: number;
}

export class VariantInventoryResponseDto implements VariantInventoryResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  variantId!: string;

  @ApiPropertyOptional({ example: 'SONY-XM5-BLK' })
  sku?: string;

  @ApiProperty({ example: 20 })
  availableQuantity!: number;

  @ApiProperty({ example: 2 })
  reservedQuantity!: number;

  @ApiProperty({ example: 22 })
  totalQuantity!: number;

  @ApiProperty({ example: 8 })
  version!: number;
}

export class LowStockItemResponseDto implements LowStockItemResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  productId!: string;

  @ApiProperty({ example: 'Sony WH-1000XM5' })
  productName!: string;

  @ApiPropertyOptional({ example: 'SONY-XM5-BLK' })
  sku?: string;

  @ApiProperty({ example: 3 })
  availableQuantity!: number;

  @ApiProperty({ example: 2 })
  reservedQuantity!: number;

  @ApiProperty({ example: 5 })
  threshold!: number;
}
