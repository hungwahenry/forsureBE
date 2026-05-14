import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class UpdatePageDto {
  @ApiPropertyOptional({
    description: 'New slug. Same rules as create.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase letters/digits separated by single hyphens.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated TipTap document JSON.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  bodyJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Updated raw HTML. Server sanitizes before storing.',
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({
    description:
      'When true and status=PUBLISHED, the page is exposed in /pages/footer.',
  })
  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @ApiPropertyOptional({
    description: 'Lower comes first in the rendered footer.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  footerOrder?: number;
}
