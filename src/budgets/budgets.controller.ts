import { Controller, Post, Get, Delete, UseGuards, Request, Param, Body } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateBudgetDto } from './dto/create-budget.dto';


@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) {}
    
    @Post()
    upsert(@Body() dto: CreateBudgetDto, @Request() req) {
        return this.budgetsService.upsert(req.user.id, dto);
    }

    @Get()
    findAll(@Request() req) {
        return this.budgetsService.findAll(req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.budgetsService.remove(id, req.user.id);
    }
}
