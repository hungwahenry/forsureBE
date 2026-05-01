import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

export const EXPLORE_DEFAULT_RADIUS_KM = 25;
export const EXPLORE_MAX_RADIUS_KM = 100;

export class ExploreQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Viewer latitude.', example: 6.4541 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({ description: 'Viewer longitude.', example: 3.3947 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: `Search radius in km (1-${EXPLORE_MAX_RADIUS_KM}, default ${EXPLORE_DEFAULT_RADIUS_KM}).`,
    default: EXPLORE_DEFAULT_RADIUS_KM,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(EXPLORE_MAX_RADIUS_KM)
  radiusKm: number = EXPLORE_DEFAULT_RADIUS_KM;
}
