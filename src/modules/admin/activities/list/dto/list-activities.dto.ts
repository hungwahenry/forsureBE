import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ActivityStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export class ListActivitiesDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Search by activity title (substring).' })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  q?: string;

  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({ description: 'Filter by host user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  hostId?: string;

  @ApiPropertyOptional({
    description:
      'Include admin-soft-deleted activities. Default false (only live).',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toBool(value))
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Activities starting at/after this ISO date.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Activities starting at/before this ISO date.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
