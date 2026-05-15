import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export enum ReportDirection {
  FILED = 'filed',
  AGAINST = 'against',
}

export class ListUserReportsDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    enum: ReportDirection,
    default: ReportDirection.FILED,
    description:
      'filed = reports submitted by the user; against = reports targeting them.',
  })
  @IsOptional()
  @IsEnum(ReportDirection)
  direction: ReportDirection = ReportDirection.FILED;
}
