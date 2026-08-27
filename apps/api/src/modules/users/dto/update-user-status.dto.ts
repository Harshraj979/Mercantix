import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@mercantix/contracts';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.SUSPENDED,
    description: 'New account status',
  })
  @IsEnum(UserStatus, {
    message: `Status must be one of: ${Object.values(UserStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status!: UserStatus;
}
