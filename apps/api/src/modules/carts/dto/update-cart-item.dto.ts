import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'Updated quantity of the product (set to 0 to remove from cart)',
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Quantity cannot be negative' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}
