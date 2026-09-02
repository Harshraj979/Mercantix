import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentStatus,
  PaymentDetailsResponse,
  PaymentInitiationResponse,
} from '@mercantix/contracts';

export class PaymentInitiationResponseDto implements PaymentInitiationResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  paymentId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderId!: string;

  @ApiProperty({ example: 49999.0 })
  amount!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'RAZORPAY' })
  provider!: string;

  @ApiProperty({ example: 'order_ABC123456789' })
  providerReference!: string;

  @ApiPropertyOptional({ example: 'secret_key_or_sdk_payload' })
  clientSecret?: string;

  @ApiPropertyOptional({ example: { key_id: 'rzp_test_123' } })
  metadata?: Record<string, any>;
}

export class PaymentDetailsResponseDto implements PaymentDetailsResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderId!: string;

  @ApiProperty({ example: 'RAZORPAY' })
  provider!: string;

  @ApiProperty({ example: 'pay_ABC123456789' })
  providerReference!: string;

  @ApiProperty({ example: 49999.0 })
  amount!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CAPTURED })
  status!: PaymentStatus;

  @ApiPropertyOptional({ example: { method: 'card', bank: 'HDFC' } })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
