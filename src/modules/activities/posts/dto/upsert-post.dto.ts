import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostVisibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const POST_CAPTION_MAX_LENGTH = 500;

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return value.length === 0 ? [] : [value];
  return [];
}

export class UpsertPostDto {
  @ApiPropertyOptional({ maxLength: POST_CAPTION_MAX_LENGTH })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(POST_CAPTION_MAX_LENGTH)
  caption?: string;

  @ApiPropertyOptional({ enum: PostVisibility })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ description: 'IDs of existing photos to keep (PATCH only).' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  keepPhotoIds?: string[];
}
