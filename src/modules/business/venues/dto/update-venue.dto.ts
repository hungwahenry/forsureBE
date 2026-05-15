import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const KEYWORD_PATTERN = /^[a-z0-9][a-z0-9 -]{0,38}$/;

export class UpdateVenueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  placeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Matches(KEYWORD_PATTERN, {
    each: true,
    message:
      'Keywords must be lowercase letters, digits, spaces, or hyphens (1–40 chars).',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) return value;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of value) {
      if (typeof raw !== 'string') continue;
      const normalized = raw.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
    return out;
  })
  matchingKeywords?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  dailyBudgetCents?: number;

  @ApiPropertyOptional({ minimum: 500, maximum: 50_000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(50_000)
  maxRadiusM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPaused?: boolean;

  @ApiPropertyOptional({
    description:
      'Public-facing phone for the venue. Loose format — owner-typed.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Public-facing website URL.' })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  websiteUrl?: string;
}
