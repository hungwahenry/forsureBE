import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityGenderPreference } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  ACTIVITY_CAPACITY_MAX,
  ACTIVITY_TITLE_MAX,
} from '../../create/dto/create-activity.dto';

export class EditActivityDto {
  @ApiPropertyOptional({ example: '🎬' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 10)
  emoji?: string;

  @ApiPropertyOptional({ example: 'watch the new wicked' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, ACTIVITY_TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({
    example: '2026-05-15T19:00:00Z',
    description: 'Must be at least 30 minutes from now.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ example: 'AMC Lekki' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  placeName?: string;

  @ApiPropertyOptional({ example: 6.4541 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  placeLat?: number;

  @ApiPropertyOptional({ example: 3.3947 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  placeLng?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ACTIVITY_CAPACITY_MAX)
  capacity?: number;

  @ApiPropertyOptional({ enum: ActivityGenderPreference })
  @IsOptional()
  @IsEnum(ActivityGenderPreference)
  genderPreference?: ActivityGenderPreference;

  @ApiPropertyOptional({
    description:
      'Whether memories from this activity can appear on Explore. Flipping to false downgrades any existing PUBLIC posts.',
  })
  @IsOptional()
  @IsBoolean()
  memoriesShareablePublicly?: boolean;

  @ApiPropertyOptional({
    description:
      'Sponsored-venue link. string → set/change (may fire CONFIRMED billing for the new venue, deduped per 30 days). null → clear the link. Absent → leave unchanged.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  businessVenueId?: string | null;
}
