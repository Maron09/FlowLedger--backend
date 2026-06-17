import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { NgxScraperService } from './ngx-scrapper.service'

import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()
@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService, private ngxScraper: NgxScraperService) {}

  private async getOrCreatePortfolio(workspaceId: string) {
    let portfolio = await this.prisma.portfolio.findUnique({
      where: { workspaceId },
    })
    if (!portfolio) {
      portfolio = await this.prisma.portfolio.create({
        data: { workspaceId },
      })
    }
    return portfolio
  }

  private async fetchPrice(symbol: string, currency: string): Promise<number | null> {
  try {
    if (currency === 'NGN') {
      return await this.ngxScraper.getNGXPrice(symbol)
    }
    const quote = await yahooFinance.quote(symbol)
    return (quote?.regularMarketPrice as number) ?? null
  } catch {
    return null
  }
}


  async searchSymbol(query: string, exchange: string) {
  if (exchange === 'NGX') {
    return this.ngxScraper.searchNGX(query)
  }
  try {
    const results = await yahooFinance.search(query)
    const quotes = (results?.quotes ?? []) as any[]
    return quotes
      .filter((r: any) => r.quoteType === 'EQUITY' || r.quoteType === 'ETF')
      .slice(0, 10)
      .map((r: any) => ({
        symbol: r.symbol,
        name: r.longname ?? r.shortname ?? r.symbol,
        type: r.quoteType,
        region: r.exchDisp ?? r.exchange ?? '',
        currency: r.currency ?? 'USD',
      }))
  } catch (err) {
    console.error('Yahoo Finance search error:', err)
    return []
  }
}

  async getPortfolio(workspaceId: string) {
    const portfolio = await this.getOrCreatePortfolio(workspaceId)

    const positions = await this.prisma.position.findMany({
      where: { portfolioId: portfolio.id },
      include: { trades: true },
    })

    const positionsWithStats = await Promise.all(
      positions.map(async (pos) => {
        const totalUnits = pos.trades.reduce((sum, t) => sum + t.units, 0)
        const totalCost = pos.trades.reduce((sum, t) => sum + t.totalCost, 0)
        const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0

        const currentPrice = await this.fetchPrice(pos.symbol, pos.currency)
        const currentValue = currentPrice ? currentPrice * totalUnits : null
        const gainLoss = currentValue ? currentValue - totalCost : null
        const gainLossPct = gainLoss && totalCost > 0 ? (gainLoss / totalCost) * 100 : null

        return {
          id: pos.id,
          symbol: pos.symbol,
          name: pos.name,
          exchange: pos.exchange,
          currency: pos.currency,
          totalUnits,
          avgCost,
          totalCost,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPct,
          trades: pos.trades.sort((a, b) =>
            new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
          ),
        }
      })
    )

    const ngnPositions = positionsWithStats.filter(p => p.currency === 'NGN')
    const usdPositions = positionsWithStats.filter(p => p.currency === 'USD')

    const totalNGN = ngnPositions.reduce((sum, p) => sum + (p.currentValue ?? p.totalCost), 0)
    const totalUSD = usdPositions.reduce((sum, p) => sum + (p.currentValue ?? p.totalCost), 0)
    const totalCostNGN = ngnPositions.reduce((sum, p) => sum + p.totalCost, 0)
    const totalCostUSD = usdPositions.reduce((sum, p) => sum + p.totalCost, 0)
    const gainLossNGN = totalNGN - totalCostNGN
    const gainLossUSD = totalUSD - totalCostUSD

    return {
      positions: positionsWithStats,
      summary: {
        NGN: {
          totalValue: totalNGN,
          totalCost: totalCostNGN,
          gainLoss: gainLossNGN,
          gainLossPct: totalCostNGN > 0 ? (gainLossNGN / totalCostNGN) * 100 : 0,
        },
        USD: {
          totalValue: totalUSD,
          totalCost: totalCostUSD,
          gainLoss: gainLossUSD,
          gainLossPct: totalCostUSD > 0 ? (gainLossUSD / totalCostUSD) * 100 : 0,
        },
      },
    }
  }

  async getPosition(workspaceId: string, symbol: string) {
    const portfolio = await this.getOrCreatePortfolio(workspaceId)

    const position = await this.prisma.position.findUnique({
      where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } },
      include: { trades: { orderBy: { buyDate: 'desc' } } },
    })

    if (!position) throw new NotFoundException('Position not found')

    const totalUnits = position.trades.reduce((sum, t) => sum + t.units, 0)
    const totalCost = position.trades.reduce((sum, t) => sum + t.totalCost, 0)
    const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0
    const currentPrice = await this.fetchPrice(symbol, position.currency)
    const currentValue = currentPrice ? currentPrice * totalUnits : null
    const gainLoss = currentValue ? currentValue - totalCost : null
    const gainLossPct = gainLoss && totalCost > 0 ? (gainLoss / totalCost) * 100 : null

    return {
      ...position,
      totalUnits,
      avgCost,
      totalCost,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
    }
  }

  async addTrade(workspaceId: string, dto: {
    symbol: string
    name: string
    exchange: string
    currency: string
    units: number
    pricePerUnit: number
    buyDate: string
    notes?: string
  }) {
    const portfolio = await this.getOrCreatePortfolio(workspaceId)

    let position = await this.prisma.position.findUnique({
      where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol: dto.symbol } },
    })

    if (!position) {
      position = await this.prisma.position.create({
        data: {
          portfolioId: portfolio.id,
          symbol: dto.symbol,
          name: dto.name,
          exchange: dto.exchange,
          currency: dto.currency,
        },
      })
    }

    const trade = await this.prisma.trade.create({
      data: {
        positionId: position.id,
        units: dto.units,
        pricePerUnit: dto.pricePerUnit,
        totalCost: dto.units * dto.pricePerUnit,
        buyDate: new Date(dto.buyDate),
        notes: dto.notes,
      },
    })

    return trade
  }

  async deleteTrade(workspaceId: string, tradeId: string) {
    const portfolio = await this.getOrCreatePortfolio(workspaceId)

    const trade = await this.prisma.trade.findFirst({
      where: {
        id: tradeId,
        position: { portfolioId: portfolio.id },
      },
      include: { position: true },
    })

    if (!trade) throw new NotFoundException('Trade not found')

    await this.prisma.trade.delete({ where: { id: tradeId } })

    const remaining = await this.prisma.trade.count({
      where: { positionId: trade.positionId },
    })
    if (remaining === 0) {
      await this.prisma.position.delete({ where: { id: trade.positionId } })
    }

    return { success: true }
  }
}