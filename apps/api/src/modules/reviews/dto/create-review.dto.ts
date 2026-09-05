import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Order item UUID representing the verified purchase',
  })
  @IsUUID('4', { message: 'Order item ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Order item ID is required' })
  orderItemId!: string;

  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Rating integer between 1 and 5 stars',
  })
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  @IsNotEmpty({ message: 'Rating is required' })
  rating!: number;

  @ApiPropertyOptional({
    example: 'Exceptional build quality and active noise cancellation!',
    description: 'Optional review text feedback',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
