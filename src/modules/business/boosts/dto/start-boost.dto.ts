import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class StartBoostDto {
  @ApiProperty({
    description: 'Activity to boost. Must be hosted by the caller.',
  })
  @IsString()
  @Length(1, 40)
  activityId!: string;

  @ApiProperty({
    description:
      'Radius in metres for nearby users to be eligible to see this boosted activity.',
    minimum: 500,
    maximum: 50_000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(50_000)
  radiusM!: number;
}
