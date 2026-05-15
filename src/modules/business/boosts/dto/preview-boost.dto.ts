import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class PreviewBoostDto {
  @ApiProperty({
    description: 'Activity to boost. Must be hosted by the caller.',
  })
  @IsString()
  @Length(1, 40)
  activityId!: string;

  @ApiProperty({ minimum: 500, maximum: 50_000 })
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(50_000)
  radiusM!: number;
}
