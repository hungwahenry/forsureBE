import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { AdminAnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { CohortsQueryDto } from './dto/cohorts-query.dto';
import { GeographyQueryDto } from './dto/geography-query.dto';

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

  @Get('cohorts')
  @ApiOperation({
    summary:
      'Weekly signup-cohort retention matrix. Active = sent a message OR joined an activity that week.',
  })
  cohorts(@Query() query: CohortsQueryDto) {
    return this.service.getCohorts(query.weeks);
  }

  @Get('funnel')
  @ApiOperation({
    summary:
      'Onboarding funnel for signups in the window: signed-up → email-verified → onboarded → joined-any → sent-any-message.',
  })
  funnel(@Query() query: AnalyticsQueryDto) {
    return this.service.getFunnel(query.days);
  }

  @Get('geography')
  @ApiOperation({
    summary:
      'Top placeNames by user count (all-time) and by activity count (within the window).',
  })
  geography(@Query() query: GeographyQueryDto) {
    return this.service.getGeography(query.days, query.limit);
  }
}
