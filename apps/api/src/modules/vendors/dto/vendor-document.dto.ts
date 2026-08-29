import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateVendorDocumentDto {
  @ApiProperty({
    example: 'GST_CERTIFICATE',
    description: 'Type of verification document (e.g. GST_CERTIFICATE, PAN_CARD, BUSINESS_LICENSE)',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Document type is required' })
  @MaxLength(50)
  documentType!: string;

  @ApiProperty({
    example: 'uploads/vendors/docs/gst_certificate_123.pdf',
    description: 'Object storage key or file path of the uploaded document',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Storage key is required' })
  @MaxLength(500)
  storageKey!: string;
}
