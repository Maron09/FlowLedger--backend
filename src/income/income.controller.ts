import { Controller, Post, Get, Patch, Delete, UseGuards, Query, Body, Request, Param  } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IncomeService } from './income.service'
import { CreateIncomeDto } from './dto/create-income.dto'
import { QueryIncomeDto } from './dto/query-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'

@Controller('income')
@UseGuards(JwtAuthGuard)
export class IncomeController {
    constructor(private readonly incomeService: IncomeService) {}

    @Post()
    create(@Body() dto: CreateIncomeDto, @Request() req) {
        return this.incomeService.create(req.user.id, dto)
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateIncomeDto, @Request() req) {
        return this.incomeService.update(id, req.user.id, dto)
    }

    @Get()
    findAll(@Query() query:QueryIncomeDto, @Request() req){
        return this.incomeService.findAll(req.user.id, query)
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.incomeService.findOne(id, req.user.id)
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.incomeService.remove(id, req.user.id)
    }
}
