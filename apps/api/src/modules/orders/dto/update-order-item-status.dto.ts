import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderItemStatus } from '@mercantix/contracts';

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    enum: OrderItemStatus,
    example: OrderItemStatus.SHIPPED,
    description: 'New status for the vendor order item',
  })
  @IsEnum(OrderItemStatus, { message: 'Invalid order item status' })
  @IsNotEmpty({ message: 'Order item status is required' })
  status!: OrderItemStatus;

  @ApiPropertyOptional({
    example: 'TRACK123456789',
    description: 'Courier tracking number',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    example: 'BlueDart / FedEx / Delhivery',
    description: 'Courier carrier name',
  })
  @IsOptional()
  @IsString()
  trackingCarrier?: string;
}
