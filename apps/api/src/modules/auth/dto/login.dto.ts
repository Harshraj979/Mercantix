import {ApiProperty} from "@nestjs/swagger";
import { IsEmail,IsNotEmpty,IsString } from "class-validator";

export class LoginDto{
    @ApiProperty({
        example: 'user@example.com',
        description: 'Registered email address',
    })
    @IsEmail({},{message:"Enter valid email address"})
    @IsNotEmpty({message: 'Email is required'})
    email!:string;

    @ApiProperty({
        example: 'StrongP@ssw0rd123',
        description: 'Account password',
    })
    @IsString()
    @IsNotEmpty({message: 'Password is required' })
    password!:string
}