import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  OrderItemResponse,
  OrderEventResponse,
  PaymentResponse,
  OrderResponse,
} from '@mercantix/contracts';

export class OrderItemResponseDto implements OrderItemResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  vendorId!: string;

  @ApiPropertyOptional({ example: 'Apex Electronics' })
  vendorName?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  productId!: string;

  @ApiPropertyOptional({ example: 'Sony WH-1000XM5' })
  productName?: string;

  @ApiPropertyOptional({ example: 'sony-wh-1000xm5' })
  productSlug?: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 29999.0 })
  unitPrice!: number;

  @ApiProperty({ example: 59998.0 })
  subtotal!: number;

  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.PENDING })
  status!: OrderItemStatus;

  @ApiPropertyOptional({ example: 'TRACK123456789' })
  trackingNumber?: string | null;

  @ApiPropertyOptional({ example: 'BlueDart' })
  trackingCarrier?: string | null;
}

export class OrderEventResponseDto implements OrderEventResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderId!: string;

  @ApiPropertyOptional({ example: 'PENDING_PAYMENT' })
  previousStatus?: string | null;

  @ApiProperty({ example: 'PAID' })
  newStatus!: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  actorId?: string | null;

  @ApiPropertyOptional({ example: { note: 'Razorpay webhook confirmation' } })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PaymentResponseDto implements PaymentResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderId!: string;

  @ApiProperty({ example: 'RAZORPAY' })
  provider!: string;

  @ApiProperty({ example: 'pay_ABC123456789' })
  providerReference!: string;

  @ApiProperty({ example: 59998.0 })
  amount!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CAPTURED })
  status!: PaymentStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OrderResponseDto implements OrderResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  buyerId!: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  shippingAddressId?: string | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  couponId?: string | null;

  @ApiProperty({ example: 500.0 })
  couponDiscount!: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @ApiProperty({ example: 59998.0 })
  subtotal!: number;

  @ApiProperty({ example: 10799.64 })
  tax!: number;

  @ApiProperty({ example: 0.0 })
  shippingFee!: number;

  @ApiProperty({ example: 0.0 })
  platformFee!: number;

  @ApiProperty({ example: 70297.64 })
  total!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'unique-idempotency-key-uuid' })
  idempotencyKey!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  orderItems!: OrderItemResponseDto[];

  @ApiPropertyOptional({ type: PaymentResponseDto })
  payment?: PaymentResponseDto | null;

  @ApiPropertyOptional({ type: [OrderEventResponseDto] })
  events?: OrderEventResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
