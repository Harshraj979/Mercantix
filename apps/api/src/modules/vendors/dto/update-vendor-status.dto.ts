import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { VendorStatus } from '@mercantix/contracts';

export class UpdateVendorStatusDto {
  @ApiProperty({
    enum: VendorStatus,
    example: VendorStatus.APPROVED,
    description: 'Updated operational status of the vendor',
  })
  @IsEnum(VendorStatus, {
    message: `Status must be one of: ${Object.values(VendorStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status!: VendorStatus;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Platform commission percentage rate charged on vendor sales (0% to 100%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Commission rate must be a valid number' })
  @Min(0, { message: 'Commission rate cannot be negative' })
  @Max(100, { message: 'Commission rate cannot exceed 100%' })
  commissionRate?: number;
}
