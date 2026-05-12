import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ReportStatus, ReportTargetType } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export class ListReportsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: ReportStatus, default: ReportStatus.PENDING })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportTargetType })
  @IsOptional()
  @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;

  @ApiPropertyOptional({ description: 'Filter by reporter user id.' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reporterId?: string;

  @ApiPropertyOptional({ description: 'Filter by reason code (e.g. SPAM).' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reasonCode?: string;
}
