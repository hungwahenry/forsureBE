import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { PostVisibility } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export class ListPostsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Search caption (substring).' })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  q?: string;

  @ApiPropertyOptional({ enum: PostVisibility })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ description: 'Filter by author user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  authorId?: string;

  @ApiPropertyOptional({ description: 'Filter by activity id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  activityId?: string;

  @ApiPropertyOptional({
    description: 'Include admin-soft-deleted posts (default false).',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toBool(value))
  @IsBoolean()
  includeDeleted?: boolean;
}
