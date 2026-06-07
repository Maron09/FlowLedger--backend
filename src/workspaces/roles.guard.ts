import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';


export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

const ROLE_HIERARCHY: Record<string, number> = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
    OWNER: 4,
}


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (!requiredRoles || requiredRoles.length === 0) return true; // No roles required, allow access

        const request = context.switchToHttp().getRequest()
        const userRole = request.workspaceRole

        if (!userRole) throw new ForbiddenException('No role assigned')
        
        const userLevel = ROLE_HIERARCHY[userRole] ?? 0
        const requiredLevel = Math.max(...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 99))

        if (userLevel < requiredLevel) {
            throw new ForbiddenException('Insufficient permissions')
        }

        return true;
    }
}