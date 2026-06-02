import { Controller, Get, UseGuards, Request, Query, Patch, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspaceGuard } from '../workspaces/workspace.guard'
import { AnalyticsService } from './analytics.service'
import { TaxProfileService } from './tax-profile.service';
import { EmploymentType } from '@prisma/client';

@Controller('w/:workspaceId/analytics')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService, private readonly taxProfileService: TaxProfileService) {}

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

  @Get('tax')
  getTaxEstimate(@Request() req) {
    return this.analyticsService.getTaxEstimate(req.workspace.id, req.workspace);
  }

  @Get('tax/profile')
  getTaxProfile(@Request() req) {
    return this.taxProfileService.getOrCreate(req.workspace.id)
  }

  @Patch('tax/profile')
  updateTaxProfile(
    @Request() req,
    @Body() dto: {
      employmentType?: EmploymentType
      taxableCategories?: string[]
      businessSector?: string
      businessSize?: string
      handlesPaye?: boolean
      vatRegistered?: boolean
      deductibleCategories?: string[]
    }
  ) {
    return this.taxProfileService.update(req.workspace.id, dto)
  }

}