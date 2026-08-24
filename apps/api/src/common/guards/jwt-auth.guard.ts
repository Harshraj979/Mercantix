import{CanActivate,ExecutionContext,Injectable,UnauthorizedException} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '@mercantix/contracts';
type AuthenticatedRequest = Request & { user: JwtPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate{
    constructor(
        private readonly jwtService:JwtService,
        private readonly configService:ConfigService,
        private readonly reflector:Reflector,
    ){}
    async canActivate(context:ExecutionContext):Promise<boolean>{
        const isPublic=this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[
            context.getHandler(),
            context.getClass(),
        ]);
        if(isPublic) return true;
        
        const request=context.switchToHttp().getRequest<AuthenticatedRequest>();
        const token=this.extractTokenFromHeader(request);

        if(!token){
            throw new UnauthorizedException('Authentication token is missing');
        }
        try{
            const secret=this.configService.get<string>('JWT_ACCESS_SECRET')|| this.configService.get<string>('jwt.accessSecret');
            const payload=await this.jwtService.verifyAsync<JwtPayload>(token,{secret});
            request.user=payload;
        }
        catch{
            throw new UnauthorizedException('Invalid or expired authentication token');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader=request.headers.authorization;
        if(!authHeader) return undefined;
        const [type,token]=authHeader.split(' ');
        return type==='Bearer'?token:undefined;
    }
}