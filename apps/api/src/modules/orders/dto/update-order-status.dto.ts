import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@mercantix/contracts';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    description: 'New status for the order',
  })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  @IsNotEmpty({ message: 'Order status is required' })
  status!: OrderStatus;

  @ApiPropertyOptional({
    example: 'Payment verified and inventory allocated',
    description: 'Optional note or reason for status transition',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
