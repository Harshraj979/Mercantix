import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

export class SetVendorBankAccountDto {
  @ApiProperty({
    example: 'Tech Haven Pvt Ltd',
    description: 'Name of the bank account holder matching business registration',
  })
  @IsString()
  @IsNotEmpty({ message: 'Account holder name is required' })
  @MaxLength(100)
  accountHolder!: string;

  @ApiProperty({
    example: 'HDFC Bank',
    description: 'Name of the commercial banking institution',
  })
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  @MaxLength(100)
  bankName!: string;

  @ApiProperty({
    example: '50100234567890',
    description: 'Bank account number (9 to 18 digits)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Account number is required' })
  @Length(9, 20, { message: 'Account number must be between 9 and 20 digits' })
  accountNumber!: string;

  @ApiProperty({
    example: 'HDFC0001234',
    description: '11-character bank branch routing code (IFSC)',
  })
  @IsString()
  @IsNotEmpty({ message: 'IFSC code is required' })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'Please provide a valid 11-character IFSC code (e.g. HDFC0001234)',
  })
  ifscCode!: string;
}
