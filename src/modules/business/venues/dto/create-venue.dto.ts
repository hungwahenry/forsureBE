import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const KEYWORD_PATTERN = /^[a-z0-9][a-z0-9 \-]{0,38}$/;

export class CreateVenueDto {
  @ApiProperty({
    description:
      'Google Place ID returned by /places/suggest. Backend retrieves coordinates + address from Google.',
  })
  @IsString()
  @Length(1, 200)
  googlePlaceId!: string;

  @ApiProperty({
    description:
      'Display name shown in the dashboard and in mobile suggestions — typically the place\'s structured main text.',
  })
  @IsString()
  @Length(1, 120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  placeName!: string;

  @ApiProperty({ description: 'Latitude returned by /places/retrieve.' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  placeLat!: number;

  @ApiProperty({ description: 'Longitude returned by /places/retrieve.' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  placeLng!: number;

  @ApiProperty({
    description:
      'Place-picker query terms that should surface this venue. Lowercase, 1–40 chars each, up to 12 keywords.',
  })
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
  matchingKeywords!: string[];

  @ApiProperty({
    description:
      'Daily budget cap in cents. The venue stops being suggested once the day\'s charges exhaust it.',
    minimum: 0,
    maximum: 1_000_000,
  })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  dailyBudgetCents!: number;

  @ApiPropertyOptional({
    description:
      'Maximum radius in metres for a user to be eligible to see this venue. Defaults to 5000m.',
    default: 5000,
    minimum: 500,
    maximum: 50_000,
  })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(50_000)
  maxRadiusM?: number;
}
