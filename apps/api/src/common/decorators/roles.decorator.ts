import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@mercantix/contracts';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
