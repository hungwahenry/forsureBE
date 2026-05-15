import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BusinessAnalyticsService } from './analytics.service';
import { boostsCsv, performanceCsv, spendCsv, venuesCsv } from './csv.helper';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

function sendCsv(res: Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(body);
}

@ApiTags('Business / Analytics')
@ApiBearerAuth()
@Controller('business/analytics')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BusinessAnalyticsController {
  constructor(private readonly service: BusinessAnalyticsService) {}

  @Get('performance')
  @ApiOperation({
    summary:
      'Picks, confirmed conversions, spend, and time-of-day pivots over the chosen window.',
  })
  performance(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
  ) {
    return this.service.getPerformance(member.businessId, q.from, q.to);
  }

  @Get('performance.csv')
  async performanceCsv(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.service.getPerformance(
      member.businessId,
      q.from,
      q.to,
    );
    sendCsv(
      res,
      `performance_${dto.window.from}_to_${dto.window.to}.csv`,
      performanceCsv(dto),
    );
  }

  @Get('venues')
  @ApiOperation({
    summary:
      'Per-venue picks, conversions, spend, last pick time, plus dormant venue ids.',
  })
  venues(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
  ) {
    return this.service.getVenues(member.businessId, q.from, q.to);
  }

  @Get('venues.csv')
  async venuesCsv(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.service.getVenues(member.businessId, q.from, q.to);
    sendCsv(
      res,
      `venues_${dto.window.from}_to_${dto.window.to}.csv`,
      venuesCsv(dto),
    );
  }

  @Get('boosts')
  @ApiOperation({
    summary:
      'Boost-by-boost ROI: spend, picks attributable during the boost window, and cost per pick.',
  })
  boosts(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
  ) {
    return this.service.getBoosts(member.businessId, q.from, q.to);
  }

  @Get('boosts.csv')
  async boostsCsv(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.service.getBoosts(member.businessId, q.from, q.to);
    sendCsv(
      res,
      `boosts_${dto.window.from}_to_${dto.window.to}.csv`,
      boostsCsv(dto),
    );
  }

  @Get('spend')
  @ApiOperation({
    summary:
      'Spend bucketed by day/week/month, split into boost spend and venue-pick spend.',
  })
  spend(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
  ) {
    return this.service.getSpend(member.businessId, q.from, q.to);
  }

  @Get('spend.csv')
  async spendCsv(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Query() q: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.service.getSpend(member.businessId, q.from, q.to);
    sendCsv(
      res,
      `spend_${dto.window.from}_to_${dto.window.to}.csv`,
      spendCsv(dto),
    );
  }
}
