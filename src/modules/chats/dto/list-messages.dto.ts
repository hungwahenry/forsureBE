import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const MESSAGES_DEFAULT_LIMIT = 30;
export const MESSAGES_MAX_LIMIT = 100;

export class ListMessagesDto {
  @ApiPropertyOptional({
    description:
      'Opaque cursor — paginate backwards in time (older messages) from this point.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: `Page size (1-${MESSAGES_MAX_LIMIT}, default ${MESSAGES_DEFAULT_LIMIT}).`,
    default: MESSAGES_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MESSAGES_MAX_LIMIT)
  limit: number = MESSAGES_DEFAULT_LIMIT;
}
