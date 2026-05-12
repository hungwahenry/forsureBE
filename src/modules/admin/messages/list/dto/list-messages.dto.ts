import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ChatMessageKind } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export class ListMessagesDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Search message body (case-insensitive substring).',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by sending user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  senderUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by activity (room) id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  activityId?: string;

  @ApiPropertyOptional({ enum: ChatMessageKind })
  @IsOptional()
  @IsEnum(ChatMessageKind)
  kind?: ChatMessageKind;

  @ApiPropertyOptional({
    description: 'Include admin-soft-deleted messages (default false).',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toBool(value))
  @IsBoolean()
  includeDeleted?: boolean;
}
