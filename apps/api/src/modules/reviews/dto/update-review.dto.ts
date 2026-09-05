import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Updated rating integer between 1 and 5 stars',
  })
  @IsOptional()
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  rating?: number;

  @ApiPropertyOptional({
    example: 'Updated feedback after 2 months of usage',
    description: 'Updated review text feedback',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
