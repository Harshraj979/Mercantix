import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationResponse,
  NotificationSummaryResponse,
} from '@mercantix/contracts';

export class NotificationResponseDto implements NotificationResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId!: string;

  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.IN_APP,
  })
  channel!: NotificationChannel;

  @ApiProperty({ example: '🛒 Order Placed Successfully' })
  title!: string;

  @ApiProperty({
    example:
      'Your order of 2 item(s) worth INR 49999.00 has been placed.',
  })
  body!: string;

  @ApiProperty({
    enum: NotificationStatus,
    example: NotificationStatus.SENT,
  })
  status!: NotificationStatus;

  @ApiPropertyOptional({ example: { orderId: 'ord-123' } })
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional({ example: false })
  isRead?: boolean;

  @ApiPropertyOptional({ example: '2026-09-01T12:00:00.000Z' })
  sentAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class NotificationSummaryResponseDto
  implements NotificationSummaryResponse
{
  @ApiProperty({ example: 3 })
  unreadCount!: number;

  @ApiProperty({ example: 15 })
  totalCount!: number;
}
