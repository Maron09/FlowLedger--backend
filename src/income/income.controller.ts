import { Controller, Post, Get, Patch, Delete, UseGuards, Query, Body, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IncomeService } from './income.service'
import { CreateIncomeDto } from './dto/create-income.dto'
import { QueryIncomeDto } from './dto/query-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'
import { WorkspaceGuard } from '../workspaces/workspace.guard'
import { RolesGuard, RequireRoles } from '../workspaces/roles.guard'

@Controller('w/:workspaceId/income')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post()
  @RequireRoles('EDITOR')
  create(@Body() dto: CreateIncomeDto, @Request() req) {
    return this.incomeService.create(req.user.id, req.workspace.id, dto)
  }

  @Patch(':id')
  @RequireRoles('EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateIncomeDto, @Request() req) {
    return this.incomeService.update(id, req.user.id, dto)
  }

  @Get()
  findAll(@Query() query: QueryIncomeDto, @Param('workspaceId') workspaceId: string) {
    return this.incomeService.findAll(workspaceId, query)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.incomeService.findOne(id, req.user.id)
  }

  @Delete(':id')
  @RequireRoles('EDITOR')
  remove(@Param('id') id: string, @Request() req) {
    return this.incomeService.remove(id, req.user.id)
  }
}