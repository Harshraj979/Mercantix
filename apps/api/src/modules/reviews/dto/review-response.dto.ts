import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReviewResponse,
  ProductRatingSummaryResponse,
  RatingDistribution,
} from '@mercantix/contracts';

export class ReviewResponseDto implements ReviewResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  buyerId!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  buyerEmail?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  productId!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  orderItemId!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'Amazing product!' })
  comment?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ProductRatingSummaryDto implements ProductRatingSummaryResponse {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  productId!: string;

  @ApiProperty({ example: 4.8 })
  averageRating!: number;

  @ApiProperty({ example: 124 })
  totalReviews!: number;

  @ApiProperty({
    example: { 5: 100, 4: 18, 3: 4, 2: 1, 1: 1 },
  })
  ratingDistribution!: RatingDistribution;
}
