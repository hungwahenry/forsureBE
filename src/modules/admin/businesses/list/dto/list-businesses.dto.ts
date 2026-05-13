import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export const AdminBusinessState = {
  ALL: 'ALL',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type AdminBusinessState =
  (typeof AdminBusinessState)[keyof typeof AdminBusinessState];

export class ListBusinessesDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Search by business id, slug, or name (substring).',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ enum: AdminBusinessState, default: 'ALL' })
  @IsOptional()
  @IsEnum(AdminBusinessState)
  state?: AdminBusinessState;
}
