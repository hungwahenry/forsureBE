import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ReportTargetType } from '@prisma/client';

export class CreateReportReasonDto {
  @ApiProperty({
    description: 'Unique code, e.g. SPAM. SCREAMING_SNAKE convention.',
  })
  @IsString()
  @Length(2, 64)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be uppercase letters, digits, and underscores.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  code!: string;

  @ApiProperty({ description: 'Human label shown to users.' })
  @IsString()
  @Length(1, 256)
  label!: string;

  @ApiPropertyOptional({ description: 'Optional longer explanation.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    description: 'Target types this reason can apply to.',
    enum: ReportTargetType,
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(ReportTargetType, { each: true })
  applicableTo!: ReportTargetType[];

  @ApiPropertyOptional({ description: 'Is this the catch-all "Other" reason.' })
  @IsOptional()
  @IsBoolean()
  isGeneral?: boolean;

  @ApiPropertyOptional({ description: 'Shown in the picker if true.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order (lower comes first).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
