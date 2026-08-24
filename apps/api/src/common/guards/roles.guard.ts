import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName, JwtPayload } from '@mercantix/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
            ROLES_KEY, [context.getHandler(), context.getClass()]
        );
        if (!requiredRoles || requiredRoles.length === 0) return true;
        const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
        if (!user || !user.roles) {
            throw new ForbiddenException("Acess denied:no user roles found");
        }
        const hasRole = requiredRoles.some((role) => user.roles.includes(role));
        if (!hasRole) {
            throw new ForbiddenException(
                `Access denied: requires one of the following roles: [${requiredRoles.join(', ')}]`,
            );
        }
        return true;
    }
}