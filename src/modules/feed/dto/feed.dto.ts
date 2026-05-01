import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

export const FEED_DEFAULT_RADIUS_KM = 25;
export const FEED_MAX_RADIUS_KM = 100;

export class FeedQueryDto extends CursorPaginationDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(FEED_MAX_RADIUS_KM)
  radiusKm: number = FEED_DEFAULT_RADIUS_KM;
}
