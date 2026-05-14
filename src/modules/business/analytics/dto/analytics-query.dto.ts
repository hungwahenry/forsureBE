import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'ISO-8601 date (UTC, inclusive). Defaults to 30 days before `to`.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 date (UTC, inclusive). Defaults to today.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
