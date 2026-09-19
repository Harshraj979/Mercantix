import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DiscountType,
  CouponResponse,
  CouponValidationResponse,
} from '@mercantix/contracts';

export class CouponResponseDto implements CouponResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'SUMMER20' })
  code!: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 999 })
  minOrderValue?: number | null;

  @ApiPropertyOptional({ example: 500 })
  maxUses?: number | null;

  @ApiProperty({ example: 42 })
  usedCount!: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  expiresAt?: Date | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CouponValidationResponseDto implements CouponValidationResponse {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: 'SUMMER20' })
  code!: string;

  @ApiPropertyOptional({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 20 })
  discountValue?: number;

  @ApiProperty({ example: 299.8 })
  discountAmount!: number;

  @ApiProperty({ example: 1499.0 })
  subtotal!: number;

  @ApiProperty({ example: 1199.2 })
  finalTotal!: number;

  @ApiProperty({ example: 'Coupon SUMMER20 applied successfully' })
  message!: string;
}
