import { createParamDecorator,ExecutionContext } from "@nestjs/common";
import {JwtPayLoad} from '@mercantix/contracts'

export const CurrentUser=createParamDecorator(
    (data:keyof JwtPayLoad|undefined,ctx:ExecutionContext)=>{
        const request=ctx.switchToHttp().getRequest();
        const user=request.user as JwtPayLoad;

        if(!user){
            return null;
        }
        return data?user[data]:user;
    }
)