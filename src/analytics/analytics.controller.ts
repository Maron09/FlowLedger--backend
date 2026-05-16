import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'


@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('overview')
    getOverview(@Request() req, @Query('month') month?: string) {
    return this.analyticsService.getOverview(req.user.id, month);
    }

    @Get('categories')
    getCategoryBreakdown(@Request() req, @Query('month') month?: string) {
    return this.analyticsService.getCategoryBreakdown(req.user.id, month);
    }

    @Get('trend')
    getMonthlyTrend(@Request() req, @Query('months') months?: number) {
    return this.analyticsService.getMonthlyTrend(req.user.id, months);
    }

    @Get('budgets')
    getBudgetStatus(@Request() req, @Query('month') month?: string) {
        return this.analyticsService.getBudgetStatus(req.user.id, month);
    }
}


