import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core'; //use to create instance of app
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    //creating the nextjs app instance using root AppModule
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 4000);
    const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'); // gets which apo can acces this api

    app.use(cookieParser());
    app.enableCors({
        origin: corsOrigin.includes(',') ?
            corsOrigin.split(',').map((o) => o.trim()) 
            : corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            }
        })
    )

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Mercantix E-Commerce API')
        .setDescription('Production-ready modular multi-vendor marketplace REST API',)
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter your JWT access token',
                in: 'header',
            },
            'JWT-auth',
        )
        .addCookieAuth('refreshToken', {
            type: 'apiKey',
            in: 'cookie',
            description: 'HTTP-only refresh token cookie',
        })
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        }
    })
    app.enableShutdownHooks();

    await app.listen(port);
    logger.log(`Mercantix API server running on http://localhost:${port}/api/v1`);
    logger.log(`Swagger OpenAPI documentation at http://localhost:${port}/api/docs`);
}

bootstrap();