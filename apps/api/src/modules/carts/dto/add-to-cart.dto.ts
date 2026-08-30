import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    example: 'prod-uuid-123',
    description: 'UUID of the product to add to cart',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Quantity to add (minimum 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity?: number = 1;
}
