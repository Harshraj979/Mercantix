import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the delivery address for this order',
  })
  @IsUUID('4', { message: 'Shipping address ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Shipping address is required' })
  shippingAddressId!: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Optional discount coupon code to apply',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({
    example: 'unique-client-generated-key-v4-uuid',
    description:
      'Client-generated idempotency key (UUID v4) to prevent duplicate order submission on network retry',
  })
  @IsString()
  @IsNotEmpty({ message: 'Idempotency key is required' })
  idempotencyKey!: string;
}
