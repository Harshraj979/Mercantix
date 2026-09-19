import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '@mercantix/contracts';

export class CreateCouponDto {
  @ApiProperty({
    example: 'SUMMER20',
    description: 'Unique coupon promo code (alphanumeric, uppercase)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  code!: string;

  @ApiProperty({
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
    description: 'Type of discount (PERCENTAGE or FLAT)',
  })
  @IsEnum(DiscountType, { message: 'Discount type must be PERCENTAGE or FLAT' })
  @IsNotEmpty({ message: 'Discount type is required' })
  discountType!: DiscountType;

  @ApiProperty({
    example: 20,
    description:
      'Value of discount (percentage e.g. 20 for 20%, or flat amount in INR)',
  })
  @IsNumber({}, { message: 'Discount value must be a number' })
  @IsPositive({ message: 'Discount value must be positive' })
  @IsNotEmpty({ message: 'Discount value is required' })
  discountValue!: number;

  @ApiPropertyOptional({
    example: 999,
    description: 'Minimum subtotal order value required to apply this coupon',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum order value must be a number' })
  @Min(0, { message: 'Minimum order value cannot be negative' })
  minOrderValue?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum total redemptions allowed across all users',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max uses must be a number' })
  @Min(1, { message: 'Max uses must be at least 1' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Expiration date in ISO-8601 format',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid expiration date format' })
  expiresAt?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the coupon is active for redemption',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
