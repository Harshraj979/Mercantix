//this file describes what data a user must send when creating/registering an account and also dictates nestJS how to validate the data
// dto -data transfer object
import {ApiProperty,ApiPropertyOptional} from "@nestjs/swagger"
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { RoleName } from "@mercantix/contracts";

export class RegisterDto{
    @ApiProperty({
        example:'user@example.com',
        description:'Valid email address of the user',
    })
    @IsEmail({},{message: 'Please provide a valid email address'})
    @IsNotEmpty({message:'Email is required'})
    email!:string;

    @ApiProperty({
        example:'StrongP@ssw0rd123',
        description: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
        minLength: 8,
        maxLength: 64,
    })
    @IsString()
    @MinLength(8,{message:'Password must be at least 8 characters long'})
    @MaxLength(64,{message:'Password cannot exceed 64 characters'})
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
        message:'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
        },
    )
    password!: string;

    @ApiPropertyOptional({
        enum: RoleName,
        default: RoleName.BUYER,
        description: 'Initial role for the registered user',
    })
    @IsOptional()
    @IsEnum(RoleName, {
        message: `Role must be one of: ${Object.values(RoleName).join(', ')}`,
    })
    role?: RoleName = RoleName.BUYER;
}
