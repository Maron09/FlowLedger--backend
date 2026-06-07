import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { MembersController } from '../workspaces/members.contoller';
import { MembersService } from './members.service';
import { EmailService } from '../auth/email.service';

@Module({
  controllers: [WorkspacesController, MembersController],
  providers: [WorkspacesService, MembersService, EmailService],
})
export class WorkspacesModule {}