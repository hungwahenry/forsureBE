import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const FEED_DEFAULT_RADIUS_KM = 25;
export const FEED_MAX_RADIUS_KM = 100;
export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 100;

export class FeedQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque cursor returned by a previous page response.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: `Page size (1-${FEED_MAX_LIMIT}, default ${FEED_DEFAULT_LIMIT}).`,
    default: FEED_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FEED_MAX_LIMIT)
  limit: number = FEED_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Viewer device latitude.',
    example: 6.4541,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({
    description: 'Viewer device longitude.',
    example: 3.3947,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: `Search radius in km (1-${FEED_MAX_RADIUS_KM}, default ${FEED_DEFAULT_RADIUS_KM}).`,
    default: FEED_DEFAULT_RADIUS_KM,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(FEED_MAX_RADIUS_KM)
  radiusKm: number = FEED_DEFAULT_RADIUS_KM;
}
