import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Order ID that was paid for',
  })
  @IsUUID('4', { message: 'Order ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Order ID is required' })
  orderId!: string;

  @ApiProperty({
    example: 'pay_ABC123456789',
    description: 'Payment provider transaction / charge ID',
  })
  @IsString()
  @IsNotEmpty({ message: 'Payment reference ID is required' })
  providerReference!: string;

  @ApiPropertyOptional({
    example: 'order_ABC123456789',
    description: 'Payment provider order / intent ID',
  })
  @IsOptional()
  @IsString()
  providerOrderId?: string;

  @ApiPropertyOptional({
    example: 'e0123456789abcdef...',
    description: 'HMAC signature returned by payment gateway for client verification',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
