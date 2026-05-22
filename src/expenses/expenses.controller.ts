import { Controller, Post, Get, Patch, Delete, UseGuards, Query, Body, Request, Param } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { QueryExpensesDto } from './dto/query-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { WorkspaceGuard } from '../workspaces/workspace.guard'


@Controller('w/:workspaceId/expenses')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class ExpensesController {
    constructor(private readonly expenseService: ExpensesService) {}

    @Post()
    create(@Body() dto: CreateExpenseDto, @Request() req) {
        return this.expenseService.create(req.user.id, req.workspace.id, dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @Request() req) {
        return this.expenseService.update(id, req.user.id, dto)
    }

    @Get()
    findAll(@Query() query:QueryExpensesDto,@Param('workspaceId') workspaceId: string, @Request() req){
        return this.expenseService.findAll(workspaceId, query)
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.expenseService.findOne(id, req.user.id)
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.expenseService.remove(id, req.user.id)
    }
}
