import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum JobState {
  ACTIVE = 'active',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

export class ListQueueJobsDto {
  @ApiPropertyOptional({ enum: JobState, default: JobState.FAILED })
  @IsOptional()
  @IsEnum(JobState)
  state: JobState = JobState.FAILED;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
