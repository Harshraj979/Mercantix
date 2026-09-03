import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({
    example: 25,
    description:
      'Quantity adjustment delta (positive to add stock, negative to reduce stock)',
  })
  @IsInt({ message: 'Adjustment must be an integer' })
  @IsNotEmpty({ message: 'Adjustment amount is required' })
  adjustment!: number;

  @ApiPropertyOptional({
    example: 'Restocked from warehouse batch #402',
    description: 'Reason or note for stock adjustment',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
