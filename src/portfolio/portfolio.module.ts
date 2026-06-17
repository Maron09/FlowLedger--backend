import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import { PortfolioService } from './portfolio.service'
import { PortfolioController } from './portfolio.controller'
import { PrismaModule } from 'prisma/prisma.module'
import { NgxScraperService } from './ngx-scrapper.service'

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, NgxScraperService],
  exports: [NgxScraperService],
})
export class PortfolioModule {}