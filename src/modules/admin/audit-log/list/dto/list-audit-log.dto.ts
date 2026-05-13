import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export class ListAuditLogDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by admin user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  adminId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by action code (free-form string so new actions are migration-free).',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by target entity type (USER / ACTIVITY / etc.).',
  })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  targetType?: string;

  @ApiPropertyOptional({ description: 'Show every action against this target id.' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  targetId?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound (ISO date-time).' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value : undefined,
  )
  from?: string;

  @ApiPropertyOptional({ description: 'Exclusive upper bound (ISO date-time).' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value : undefined,
  )
  to?: string;
}
