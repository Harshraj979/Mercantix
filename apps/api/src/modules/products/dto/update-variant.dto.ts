import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateVariantDto {
  @ApiPropertyOptional({
    example: 'IPHONE15-PRO-256-BLK-V2',
    description: 'Updated SKU code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    example: { storage: '256GB', color: 'Space Black' },
    description: 'Updated variant attributes',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({
    example: 1249.99,
    description: 'Updated variant price',
  })
  @IsOptional()
  @IsPositive()
  price?: number;
}
