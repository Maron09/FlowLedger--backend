import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        const workspaceId = request.params?.workspaceId;

        if (!workspaceId) throw new NotFoundException('Workspace ID is required');

        const member = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
            include: { workspace: true }
        })

        if (!member) throw new ForbiddenException('You are not a member of this workspace');

        request.workspace = member.workspace; // Attach workspace to request for later use
        request.workspaceRole = member.role; // Attach role to request for later use

        return true;
    }
}