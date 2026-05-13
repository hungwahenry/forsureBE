import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminAnalyticsController } from './analytics.controller';
import { AdminAnalyticsService } from './analytics.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
