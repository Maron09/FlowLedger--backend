import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { AiService } from './ai.service';

@Controller('w/:workspaceId/ai')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Request() req, @Body() dto: { message: string }) {
    return this.aiService.chat(req.workspace.id, dto.message, req.workspace)
  }
}