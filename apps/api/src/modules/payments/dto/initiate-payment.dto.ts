import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Order ID to initiate payment for',
  })
  @IsUUID('4', { message: 'Order ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Order ID is required' })
  orderId!: string;

  @ApiPropertyOptional({
    example: 'RAZORPAY',
    default: 'RAZORPAY',
    description: 'Payment provider gateway name (e.g. RAZORPAY, STRIPE)',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    example: 'pay-idem-uuid-v4',
    description: 'Unique idempotency key for this payment attempt',
  })
  @IsString()
  @IsNotEmpty({ message: 'Idempotency key is required' })
  idempotencyKey!: string;
}
