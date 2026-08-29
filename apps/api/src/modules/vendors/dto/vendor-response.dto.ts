import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, VendorStatus } from '@mercantix/contracts';

export class VendorDocumentResponseDto {
  @ApiProperty({ example: 'doc-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'vendor-uuid-123' })
  vendorId!: string;

  @ApiProperty({ example: 'GST_CERTIFICATE' })
  documentType!: string;

  @ApiProperty({ example: 'uploads/vendors/docs/gst_certificate_123.pdf' })
  storageKey!: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PENDING })
  verificationStatus!: DocumentStatus;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  createdAt!: Date;
}

export class VendorBankAccountResponseDto {
  @ApiProperty({ example: 'bank-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'vendor-uuid-123' })
  vendorId!: string;

  @ApiProperty({ example: 'Tech Haven Pvt Ltd' })
  accountHolder!: string;

  @ApiProperty({ example: 'HDFC Bank' })
  bankName!: string;

  @ApiProperty({ example: '************5678' })
  accountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234' })
  ifscCode!: string;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  updatedAt!: Date;
}

export class VendorResponseDto {
  @ApiProperty({ example: 'vendor-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'user-uuid-123' })
  ownerUserId!: string;

  @ApiProperty({ example: 'Tech Haven Electronics' })
  storeName!: string;

  @ApiProperty({ example: 'tech-haven-electronics' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Authorized retailer of high-quality electronics.' })
  description?: string | null;

  @ApiProperty({ enum: VendorStatus, example: VendorStatus.DRAFT })
  status!: VendorStatus;

  @ApiProperty({ example: 10.0 })
  commissionRate!: number;

  @ApiPropertyOptional({ type: [VendorDocumentResponseDto] })
  documents?: VendorDocumentResponseDto[];

  @ApiPropertyOptional({ type: VendorBankAccountResponseDto })
  bankAccount?: VendorBankAccountResponseDto | null;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  updatedAt!: Date;
}

export class PublicVendorResponseDto {
  @ApiProperty({ example: 'vendor-uuid-123' })
  id!: string;

  @ApiProperty({ example: 'Tech Haven Electronics' })
  storeName!: string;

  @ApiProperty({ example: 'tech-haven-electronics' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Authorized retailer of high-quality electronics.' })
  description?: string | null;

  @ApiProperty({ enum: VendorStatus, example: VendorStatus.APPROVED })
  status!: VendorStatus;

  @ApiProperty({ example: '2026-08-29T00:00:00.000Z' })
  createdAt!: Date;
}
