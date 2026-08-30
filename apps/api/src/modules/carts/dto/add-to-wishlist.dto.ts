import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({
    example: 'prod-uuid-123',
    description: 'UUID of the product to add to wishlist',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;
}
