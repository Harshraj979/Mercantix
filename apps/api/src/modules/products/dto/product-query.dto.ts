import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@mercantix/contracts';

export enum ProductSortBy {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'iphone', description: 'Search term for name, description, tags' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cat-uuid-123', description: 'Filter by category UUID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'vendor-uuid-123', description: 'Filter by vendor UUID' })
  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @ApiPropertyOptional({ example: 100, description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  minPrice?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ProductSortBy, default: ProductSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ enum: ProductStatus, description: 'Filter by status (Admin / Vendor only)' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
