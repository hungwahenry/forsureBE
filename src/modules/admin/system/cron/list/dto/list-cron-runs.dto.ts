import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CursorPaginationDto } from '../../../../../../common/dto/pagination.dto';

export enum CronRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ListCronRunsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter to a specific job name.' })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  jobName?: string;

  @ApiPropertyOptional({ enum: CronRunStatus })
  @IsOptional()
  @IsEnum(CronRunStatus)
  status?: CronRunStatus;
}
