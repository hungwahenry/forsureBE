import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export class ListBlocksDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description:
      'Search by email / username / displayName / user id of either side.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by user who issued the block.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  blockerId?: string;

  @ApiPropertyOptional({ description: 'Filter by user who was blocked.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  blockedId?: string;
}
