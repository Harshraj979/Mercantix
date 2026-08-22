/*
 Problem:-
    Every value in process.env is string not a number so whenever a user forgets to add DATABASE_URl or
    JWT_SECRET the app starts quietly but crashes later on
*/

import { plainToInstance } from "class-transformer"; // converts normal js object to an instance of ur class
import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    validateSync,
} from 'class-validator';

//1. Allowed runtime environments
export enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

//2. The schema blueprint describing what our .env should look like

export class EnvironmentVariables {
    @IsEnum(Environment)
    @IsOptional()
    NODE_ENV: Environment = Environment.Development;

    @IsNumber()
    @IsOptional()
    PORT: number = 4000;

    @IsString()
    DATABASE_URL!: string;

    @IsString()
    @IsOptional()
    REDIS_URL: string = 'redis://localhost:6379';

    @IsString()
    JWT_ACCESS_SECRET!: string;

    @IsString()
    @IsOptional()
    JWT_REFRESH_SECRET?: string;

    @IsString()
    @IsOptional()
    JWT_ACCESS_EXPIRATION: string = '15m';

    @IsString()
    @IsOptional()
    JWT_REFRESH_EXPIRATION: string = '7d';
    
    @IsString()
    @IsOptional()
    CORS_ORIGIN: string = 'http://localhost:3000';
}

export function validate(config:Record<string,unknown>){
    const validateConfig=plainToInstance(EnvironmentVariables,config,{
        enableImplicitConversion:true,
    });

    const errors=validateSync(validateConfig,{
        skipMissingProperties:false,
    });

    if(errors.length>0){
        throw new Error(`Environment validation failed: ${errors.toString()}`);
    }

    return validateConfig;
}

