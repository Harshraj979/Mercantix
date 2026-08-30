import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@mercantix/contracts';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
    description: 'Product lifecycle status',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
