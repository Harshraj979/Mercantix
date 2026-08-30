import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    example: 'IPHONE15-PRO-256-BLK',
    description: 'Unique Stock Keeping Unit (SKU)',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  @MaxLength(50)
  sku!: string;

  @ApiProperty({
    example: { storage: '256GB', color: 'Black Titanium' },
    description: 'JSON object defining variant attributes',
  })
  @IsObject({ message: 'Attributes must be a valid JSON object' })
  @IsNotEmpty({ message: 'Attributes are required' })
  attributes!: Record<string, any>;

  @ApiPropertyOptional({
    example: 1299.99,
    description: 'Variant-specific price override (if null, product base price applies)',
  })
  @IsOptional()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    example: 50,
    default: 0,
    description: 'Initial stock available for this specific variant',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number = 0;
}
