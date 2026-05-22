import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspacesService } from './workspaces.service'
import { WorkspaceType } from '@prisma/client'

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) {}

    @Post()
    create(@Body() dto: { name: string; type?: WorkspaceType; currency?: string }, @Request() req) {
        return this.workspacesService.create(req.user.id, dto);
    }


    @Get()
    findAll(@Request() req) {
        return this.workspacesService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.workspacesService.findOne(id, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.workspacesService.remove(id, req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: { name?: string; type?: WorkspaceType; currency?: string }, @Request() req) {
        return this.workspacesService.update(id, req.user.id, dto);
    }

    @Post(':id/switch')
    switch(@Param('id') id: string, @Request() req) {
        return this.workspacesService.switchWorkspace(id, req.user.id);
    }
}

