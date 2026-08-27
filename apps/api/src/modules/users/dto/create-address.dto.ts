import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {IsBoolean,IsNotEmpty,IsOptional,IsString,MaxLength,} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of recipient' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(100)
  fullName!: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'Flat 402, Sunshine Apartments', description: 'Address line 1' })
  @IsString()
  @IsNotEmpty({ message: 'Address line 1 is required' })
  @MaxLength(255)
  line1!: string;

  @ApiPropertyOptional({ example: 'Near Metro Station', description: 'Address line 2 / Landmark' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ example: 'Mumbai', description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Maharashtra', description: 'State / Province' })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '400001', description: 'Postal code / PIN code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20)
  postalCode!: string;

  @ApiPropertyOptional({ example: 'IN', default: 'IN', description: 'Country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string = 'IN';

  @ApiPropertyOptional({ example: false, default: false, description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
