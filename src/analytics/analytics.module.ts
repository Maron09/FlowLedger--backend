import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TaxProfileService } from './tax-profile.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TaxProfileService],
})
export class AnalyticsModule {}