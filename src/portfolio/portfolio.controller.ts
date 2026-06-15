import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards
} from '@nestjs/common'
import { PortfolioService } from './portfolio.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WorkspaceGuard } from '../workspaces/workspace.guard'

@Controller('w/:workspaceId/portfolio')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@Param('workspaceId') workspaceId: string) {
    return this.portfolioService.getPortfolio(workspaceId)
  }

  @Get('search')
  searchSymbol(@Query('q') query: string) {
    return this.portfolioService.searchSymbol(query)
  }

  @Get(':symbol')
  getPosition(
    @Param('workspaceId') workspaceId: string,
    @Param('symbol') symbol: string,
  ) {
    return this.portfolioService.getPosition(workspaceId, symbol)
  }

  @Post('trades')
  addTrade(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: {
      symbol: string
      name: string
      exchange: string
      currency: string
      units: number
      pricePerUnit: number
      buyDate: string
      notes?: string
    },
  ) {
    return this.portfolioService.addTrade(workspaceId, dto)
  }

  @Delete('trades/:tradeId')
  deleteTrade(
    @Param('workspaceId') workspaceId: string,
    @Param('tradeId') tradeId: string,
  ) {
    return this.portfolioService.deleteTrade(workspaceId, tradeId)
  }
}