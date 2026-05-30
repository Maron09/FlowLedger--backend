import { Controller, Get, UseGuards, Request, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspaceGuard } from '../workspaces/workspace.guard'
import { AnalyticsService } from './analytics.service'

@Controller('w/:workspaceId/analytics')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Request() req, @Query('month') month?: string) {
    return this.analyticsService.getOverview(req.workspace.id, month);
  }

  @Get('categories')
  getCategoryBreakdown(@Request() req, @Query('month') month?: string) {
    return this.analyticsService.getCategoryBreakdown(req.workspace.id, month);
  }

  @Get('trend')
  getMonthlyTrend(@Request() req, @Query('months') months?: number) {
    return this.analyticsService.getMonthlyTrend(req.workspace.id, months);
  }

  @Get('budgets')
  getBudgetStatus(@Request() req, @Query('month') month?: string) {
    return this.analyticsService.getBudgetStatus(req.workspace.id, month);
  }

  @Get('insights')
  getInsights(@Request() req) {
    return this.analyticsService.getInsights(req.workspace.id);
  }
}