import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { WorkspaceType, WorkspaceRole } from '@prisma/client'

@Injectable()
export class WorkspacesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, dto: { name: string; type?: WorkspaceType; currency?: string }) {
        const workspace = await this.prisma.workspace.create({
            data: {
                name: dto.name,
                type: dto.type ?? WorkspaceType.PERSONAL,
                currency: dto.currency ?? 'NGN',
                ownerId: userId,
            },
        })

        await this.prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                role: WorkspaceRole.OWNER,
            }
        })

        await this.prisma.user.update({
            where: { id: userId },
            data: { lastWorkspaceId: workspace.id },
        })
        return workspace;
    }

    async findAll(userId: string) {
        return this.prisma.workspace.findMany({
            where: {
            members: { some: { userId } },
            },
            include: {
            _count: { select: { members: true } },
            members: {
                select: { role: true, userId: true },
            },
            },
            orderBy: { createdAt: 'asc' },
        })
        }

    async findOne(id: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                _count: { select: { members: true } },
                members: {
                    where: { userId },
                    select: { role: true },
                },
            }
        })

        if (!workspace) throw new NotFoundException('Workspace not found');

        if (!workspace.members.length) throw new ForbiddenException();

        return workspace;
    }

    async update(id: string, userId: string, dto: { name?: string; type?: WorkspaceType; currency?: string }) {
        const workspace = await this.findOne(id, userId);

        if (workspace.members[0].role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Only workspace owners can update the workspace');
        }

        return this.prisma.workspace.update({
            where: { id },
            data: {
                name: dto.name ?? workspace.name,
                type: dto.type ?? workspace.type,
                currency: dto.currency ?? workspace.currency,
            },
        })
    }

    async remove(id: string, userId: string) {
        const workspace = await this.findOne(id, userId);

        if (workspace.members[0].role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Only workspace owners can remove the workspace');
        }

        const userWorkspaces = await this.prisma.workspace.count({
            where: { ownerId: userId },
        });

        if (userWorkspaces <= 1) {
            throw new BadRequestException('Cannot delete your only workspace');
        }

        return this.prisma.workspace.delete({
            where: { id },
        });
    }

    async switchWorkspace(id: string, userId: string) {
        await this.findOne(id, userId);
        
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastWorkspaceId: id },
        });
        return { workspaceId: id };
    }
}