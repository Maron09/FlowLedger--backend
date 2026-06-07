import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from '../auth/email.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { userId: 'asc' },
    })
  }

  async invite(workspaceId: string, inviterId: string, email: string, role: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) throw new NotFoundException('Workspace not found')

    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } })
    const existingUser = await this.prisma.user.findUnique({ where: { email } })
    const workspaceRole = role as WorkspaceRole

    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      })
      if (alreadyMember) throw new BadRequestException('User is already a member of this workspace')

      await this.prisma.workspaceMember.create({
        data: { workspaceId, userId: existingUser.id, role: workspaceRole },
      })

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { lastWorkspaceId: workspaceId },
      })

      await this.emailService.sendWorkspaceInvite(existingUser.email, {
        inviterName: inviter?.firstName ?? inviter?.email ?? 'Someone',
        workspaceName: workspace.name,
        role,
        isExistingUser: true,
      })

      return { message: `${email} has been added to the workspace` }
    } else {
      await this.emailService.sendWorkspaceInvite(email, {
        inviterName: inviter?.firstName ?? inviter?.email ?? 'Someone',
        workspaceName: workspace.name,
        role,
        isExistingUser: false,
      })

      return { message: `Invite sent to ${email}` }
    }
  }

  async updateRole(memberId: string, role: string) {
    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: role as WorkspaceRole },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
  }

  async removeMember(workspaceId: string, requesterId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    })

    if (!member) throw new NotFoundException('Member not found')
    if (member.role === 'OWNER') throw new BadRequestException('Cannot remove the workspace owner')
    if (member.userId === requesterId) throw new BadRequestException('Cannot remove yourself')

    await this.prisma.workspaceMember.delete({ where: { id: memberId } })
    return { message: 'Member removed' }
  }
}