import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentStatus } from '@mercantix/contracts';

export class VerifyDocumentDto {
  @ApiProperty({
    enum: DocumentStatus,
    example: DocumentStatus.VERIFIED,
    description: 'Updated verification status of the document (VERIFIED or REJECTED)',
  })
  @IsEnum(DocumentStatus, {
    message: `Status must be one of: ${Object.values(DocumentStatus).join(', ')}`,
  })
  @IsNotEmpty()
  verificationStatus!: DocumentStatus;
}
