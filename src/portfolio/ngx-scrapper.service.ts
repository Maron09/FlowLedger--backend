import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'prisma/prisma.service'
import axios from 'axios'
import * as cheerio from 'cheerio'

@Injectable()
export class NgxScraperService {
  private readonly logger = new Logger(NgxScraperService.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scrapeNGX() {
    this.logger.log('Starting NGX price scrape...')
    try {
      const { data } = await axios.get(
        'https://ngxgroup.com/exchange/data/equities-price-list/',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 30000,
        }
      )

      const $ = cheerio.load(data)
      const stocks: { symbol: string; name: string; price: number; change: number }[] = []

      // Parse the NGX price list table
      $('table tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length >= 3) {
          const symbol = $(cells[0]).text().trim()
          const name = $(cells[1]).text().trim()
          const priceText = $(cells[2]).text().trim().replace(/[^0-9.]/g, '')
          const changeText = $(cells[3]).text().trim().replace(/[^0-9.-]/g, '')

          const price = parseFloat(priceText)
          const change = parseFloat(changeText) || 0

          if (symbol && price && !isNaN(price) && price > 0) {
            stocks.push({ symbol, name, price, change })
          }
        }
      })

      if (stocks.length === 0) {
        // Try alternative parsing - sometimes data is in different format
        const text = $('body').text()
        const matches = text.matchAll(/([A-Z]{2,20})\s+N(\d+(?:\.\d+)?)\s+([-\d.]+)\s*%/g)
        for (const match of matches) {
          const symbol = match[1]
          const price = parseFloat(match[2])
          const change = parseFloat(match[3]) || 0
          if (symbol && price && !isNaN(price) && price > 0) {
            stocks.push({ symbol, name: symbol, price, change })
          }
        }
      }

      this.logger.log(`Found ${stocks.length} NGX stocks`)

      // Upsert all prices to database
      if (stocks.length > 0) {
        await Promise.all(
          stocks.map((stock) =>
            this.prisma.stockPrice.upsert({
              where: { symbol: stock.symbol },
              update: {
                price: stock.price,
                change: stock.change,
                name: stock.name || stock.symbol,
              },
              create: {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: stock.price,
                change: stock.change,
                exchange: 'NGX',
                currency: 'NGN',
              },
            })
          )
        )
        this.logger.log(`Updated ${stocks.length} NGX stock prices`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`NGX scrape failed: ${message}`)
    }
  }

  async getNGXPrice(symbol: string): Promise<number | null> {
    const stock = await this.prisma.stockPrice.findUnique({
      where: { symbol: symbol.toUpperCase() },
    })
    return stock?.price ?? null
  }

  async searchNGX(query: string) {
    const stocks = await this.prisma.stockPrice.findMany({
      where: {
        OR: [
          { symbol: { contains: query.toUpperCase() } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
        exchange: 'NGX',
      },
      take: 10,
    })
    return stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      type: 'EQUITY',
      region: 'Nigeria',
      currency: 'NGN',
      price: s.price,
    }))
  }

  // Run once on startup to populate prices
  async onModuleInit() {
    const count = await this.prisma.stockPrice.count()
    if (count === 0) {
      this.logger.log('No NGX prices found, running initial scrape...')
      await this.scrapeNGX()
    }
  }
}