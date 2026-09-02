import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus, VendorPayoutResponse } from '@mercantix/contracts';

export class VendorPayoutResponseDto implements VendorPayoutResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderItemId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  vendorId!: string;

  @ApiPropertyOptional({ example: 'Sony WH-1000XM5' })
  productName?: string;

  @ApiProperty({ example: 29999.0 })
  grossAmount!: number;

  @ApiProperty({ example: 2999.9 })
  commission!: number;

  @ApiProperty({ example: 26999.1 })
  netAmount!: number;

  @ApiProperty({ enum: PayoutStatus, example: PayoutStatus.PENDING })
  status!: PayoutStatus;

  @ApiPropertyOptional({ example: null })
  paidAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
