import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ReassignHostDto {
  @ApiProperty({
    description: 'User id of the new host. Must already be a member of the activity.',
  })
  @IsString()
  @Length(1, 64)
  newHostId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;
}
