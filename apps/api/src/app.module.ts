// NestJS Root Module
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { HttpExceptionFilter } from "@common/filters/http-exception.filter";
import { LoggingInterceptor } from "@common/interceptors/logging.interceptor";
import { TransformInterceptor } from "@common/interceptors/transform.interceptor";
import { PrismaModule } from "@common/prisma/prisma.module";
import configuration from "./config/configuration";
import { validate } from './config/env.validation';

@Module({
    imports: [
        //1. Load and validate env globally
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
            load: [configuration],
            validate,
        }),
        //2. GLobal database connection 
        PrismaModule,
    ],
    controllers: [AppController],
    providers: [
        {
            //1. Provide global exception handler
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,

        },
        {
            //2. Register global request logging interceptor

            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            // 3. register global transform interceptors for the app
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ]
})
export  class AppModule{ };
