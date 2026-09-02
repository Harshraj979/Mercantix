// NestJS Root Module
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { HttpExceptionFilter } from "@common/filters/http-exception.filter";
import { LoggingInterceptor } from "@common/interceptors/logging.interceptor";
import { TransformInterceptor } from "@common/interceptors/transform.interceptor";
import { PrismaModule } from "@common/prisma/prisma.module";
import { AuthModule } from "@modules/auth/auth.module";
import { UsersModule } from "@modules/users/users.module";
import { VendorsModule } from "@modules/vendors/vendors.module";
import { ProductsModule } from "@modules/products/products.module";
import { CartsModule } from "@modules/carts/carts.module";
import { OrdersModule } from "@modules/orders/orders.module";
import { PaymentsModule } from "@modules/payments/payments.module";
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
        //2. Global database connection 
        PrismaModule,
        //3. AuthModule
        AuthModule,
        //4. UsersModule
        UsersModule,
        //5. VendorsModule
        VendorsModule,
        //6. ProductsModule
        ProductsModule,
        //7. CartsModule
        CartsModule,
        //8. OrdersModule
        OrdersModule,
        //9. PaymentsModule
        PaymentsModule,
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
            // 3. Register global transform interceptors for the app
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ]
})
export class AppModule {}
