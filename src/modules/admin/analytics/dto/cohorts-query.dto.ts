import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CohortsQueryDto {
  @ApiPropertyOptional({
    description:
      'Number of weekly cohorts to return. Default 8, min 4, max 24.',
    default: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(24)
  weeks: number = 8;
}
