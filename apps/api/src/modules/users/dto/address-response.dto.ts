import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  phone?: string | null;

  @ApiProperty({ example: 'Flat 402, Sunshine Apartments' })
  line1!: string;

  @ApiPropertyOptional({ example: 'Near Metro Station' })
  line2?: string | null;

  @ApiProperty({ example: 'Mumbai' })
  city!: string;

  @ApiProperty({ example: 'Maharashtra' })
  state!: string;

  @ApiProperty({ example: '400001' })
  postalCode!: string;

  @ApiProperty({ example: 'IN' })
  country!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty({ example: '2026-08-27T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-27T00:00:00.000Z' })
  updatedAt!: Date;
}
