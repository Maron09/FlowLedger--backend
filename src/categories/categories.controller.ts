import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update.dto'
import { WorkspaceGuard } from '../workspaces/workspace.guard'

@Controller('w/:workspaceId/categories')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}


    @Post()
    create(@Body() dto: CreateCategoryDto, @Request() req) {
        return this.categoriesService.create(req.user.id, req.workspace.id, dto);
    }


    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Request() req) {
        return this.categoriesService.update(id, req.user.id, dto)
    }

    @Get()
    findAll(@Request() req, @Param('workspaceId') workspaceId: string) {
        return this.categoriesService.findAll(workspaceId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.categoriesService.findOne(id, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.categoriesService.remove(id, req.user.id);
    }
}
