import { ApiProperty } from "@nestjs/swagger";
import { RoleName, UserStatus } from "@mercantix/contracts";

export class UserResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id!: string;

    @ApiProperty({ example: 'user@example.com' })
    email!: string

    @ApiProperty({ example: false })
    isEmailVerified!: boolean

    @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
    status!: UserStatus;

    @ApiProperty({ enum: RoleName, isArray: true, example: [RoleName.BUYER] })
    roles!: RoleName[];

    @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
    createdAt!: Date;
}

export class AuthResponseDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT Access Token (valid for 15 minutes)',
    })
    accessToken!: string;
    @ApiProperty({ type: UserResponseDto })
    user!: UserResponseDto;
}

export class MessageResponseDto {
    @ApiProperty({ example: 'Logged out successfully' })
    message!: string;
}
