import { Controller, Get, Query, Request, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { ExportService } from './export.service';


@Controller('w/:workspaceId/export')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async exportCsv(
    @Request() req,
    @Query('type') type: 'all' | 'expenses' | 'income' = 'all',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.generateCsv(
      req.workspace.id,
      type,
      startDate,
      endDate,
    )

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="flowledger-${startDate}-to-${endDate}.csv"`)
    res.send(csv)
  }
}