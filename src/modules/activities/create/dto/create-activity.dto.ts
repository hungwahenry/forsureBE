import { ApiProperty } from '@nestjs/swagger';
import { ActivityGenderPreference } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export const ACTIVITY_TITLE_MAX = 100;
export const ACTIVITY_CAPACITY_MAX = 25;

export class CreateActivityDto {
  @ApiProperty({
    example: '🎬',
    description: 'Single emoji codepoint (allow up to 10 chars for ZWJ sequences).',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 10)
  emoji!: string;

  @ApiProperty({ example: 'watch the new wicked' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, ACTIVITY_TITLE_MAX)
  title!: string;

  @ApiProperty({
    example: '2026-04-30T19:00:00Z',
    description: 'Must be at least 30 minutes from now.',
  })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ example: 'AMC Lekki' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  placeName!: string;

  @ApiProperty({ example: 6.4541 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  placeLat!: number;

  @ApiProperty({ example: 3.3947 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  placeLng!: number;

  @ApiProperty({
    example: 3,
    description: 'Number of additional people wanted (excluding the host).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ACTIVITY_CAPACITY_MAX)
  capacity!: number;

  @ApiProperty({ enum: ActivityGenderPreference })
  @IsEnum(ActivityGenderPreference)
  genderPreference!: ActivityGenderPreference;
}
