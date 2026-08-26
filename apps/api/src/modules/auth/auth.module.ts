import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@common/prisma/prisma.module";
import { JwtAuthGuard,RolesGuard } from "@common/guards";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
    imports:[
        PrismaModule,
        JwtModule.registerAsync({
            inject:[ConfigService],
            useFactory:(configService:ConfigService)=>({
                secret:
                    configService.get<string>('JWT_ACCESS_SECRET')||
                    configService.get<string>('jwt.accessSecret'),
                
                signOptions:{
                    expiresIn:
                        configService.get<string>('JWT_ACCESS_EXPIRATION') ||
                        configService.get<string>('jwt.accessExpiration') ||
                        '15m',
                },
            }),
        }),
    ],
    controllers:[AuthController],
    providers:[AuthService,JwtAuthGuard,RolesGuard],
    exports:[AuthService,JwtModule,JwtAuthGuard,RolesGuard]
})

export class AuthModule{}