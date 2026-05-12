import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export enum SessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export class ListSessionsDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description:
      'Search by user email / username / displayName / user id or IP address.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Filter by owning user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  userId?: string;
}
