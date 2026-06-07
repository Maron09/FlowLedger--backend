import { Controller, Post, Get, Delete, UseGuards, Request, Param, Body } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateBudgetDto } from './dto/create-budget.dto';
import { WorkspaceGuard } from '../workspaces/workspace.guard'
import { RolesGuard, RequireRoles } from '../workspaces/roles.guard'

@Controller('w/:workspaceId/budgets')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @RequireRoles('ADMIN')
  upsert(@Body() dto: CreateBudgetDto, @Request() req) {
    return this.budgetsService.upsert(req.user.id, req.workspace.id, dto)
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.budgetsService.findAll(workspaceId)
  }

  @Delete(':id')
  @RequireRoles('ADMIN')
  remove(@Param('id') id: string, @Request() req) {
    return this.budgetsService.remove(id, req.user.id)
  }
}