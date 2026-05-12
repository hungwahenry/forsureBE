import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ReportTargetType } from '@prisma/client';

export class UpdateReportReasonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 256)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    enum: ReportTargetType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(ReportTargetType, { each: true })
  applicableTo?: ReportTargetType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGeneral?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
