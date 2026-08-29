import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({
    example: 'Tech Haven Electronics',
    description: 'Unique display name of the vendor store',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Store name is required' })
  @MinLength(3, { message: 'Store name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Store name cannot exceed 100 characters' })
  storeName!: string;

  @ApiPropertyOptional({
    example: 'Authorized retailer of high-quality electronics, gadgets, and accessories.',
    description: 'Detailed description of the store',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
