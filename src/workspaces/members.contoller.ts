import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request, UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from './workspace.guard';
import { RolesGuard, RequireRoles } from './roles.guard';
import { MembersService } from '../workspaces/members.service';

@Controller('w/:workspaceId/members')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  getMembers(@Request() req) {
    return this.membersService.getMembers(req.workspace.id)
  }

  @Post('invite')
  @RequireRoles('ADMIN', 'OWNER')
  invite(@Request() req, @Body() dto: { email: string; role: string }) {
    return this.membersService.invite(req.workspace.id, req.user.id, dto.email, dto.role)
  }

  @Patch(':memberId/role')
  @RequireRoles('OWNER')
  updateRole(@Param('memberId') memberId: string, @Body() dto: { role: string }) {
    return this.membersService.updateRole(memberId, dto.role)
  }

  @Delete(':memberId')
  @RequireRoles('ADMIN', 'OWNER')
  removeMember(@Request() req, @Param('memberId') memberId: string) {
    return this.membersService.removeMember(req.workspace.id, req.user.id, memberId)
  }
}