import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({
    example: 'SAVE20',
    description: 'Coupon promo code to test and validate',
  })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  code!: string;

  @ApiProperty({
    example: 1499.0,
    description: 'Current cart subtotal in INR against which to check coupon rules',
  })
  @IsNumber({}, { message: 'Subtotal must be a number' })
  @IsPositive({ message: 'Subtotal must be positive' })
  @IsNotEmpty({ message: 'Subtotal is required' })
  subtotal!: number;
}
