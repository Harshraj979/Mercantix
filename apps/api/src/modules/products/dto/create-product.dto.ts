import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductImageDto {
  @ApiProperty({
    example: 'uploads/products/iphone15_front.jpg',
    description: 'Storage key or URI for the product image',
  })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Front View' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number = 0;
}

export class CreateProductDto {
  @ApiProperty({
    example: 'iPhone 15 Pro Max',
    description: 'Title or name of the product',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(3, { message: 'Product name must be at least 3 characters long' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name!: string;

  @ApiProperty({
    example: 'cat-uuid-123',
    description: 'Category ID the product belongs to',
  })
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId!: string;

  @ApiPropertyOptional({
    example: 'Flagship smartphone featuring aerospace-grade titanium design and A17 Pro chip.',
    description: 'Detailed product description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 1199.99,
    description: 'Base selling price in currency units',
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid monetary number' })
  @IsPositive({ message: 'Price must be greater than zero' })
  price!: number;

  @ApiPropertyOptional({
    example: ['apple', 'smartphone', 'flagship', 'titanium'],
    description: 'Search and filter tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[] = [];

  @ApiPropertyOptional({
    example: 100,
    default: 0,
    description: 'Initial stock available in warehouse',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number = 0;

  @ApiPropertyOptional({
    type: [ProductImageDto],
    description: 'Product image gallery',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[] = [];
}
