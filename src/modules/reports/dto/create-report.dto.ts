import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const REPORT_DETAILS_MAX_LENGTH = 1000;

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  targetId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  reasonId!: string;

  @ApiPropertyOptional({ maxLength: REPORT_DETAILS_MAX_LENGTH })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(REPORT_DETAILS_MAX_LENGTH)
  details?: string;
}
