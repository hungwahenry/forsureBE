import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { AdminAnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Admin / Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Aggregate platform analytics: user growth, engagement, activity health, moderation health.',
  })
  get(@Query() query: AnalyticsQueryDto) {
    return this.service.get(query.days);
  }
}
