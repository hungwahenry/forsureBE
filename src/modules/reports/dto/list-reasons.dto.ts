import { ApiProperty } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ListReasonsDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;
}
