import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class TakedownDto {
  @ApiProperty({ description: 'Reason for taking down the post.' })
  @IsString()
  @Length(3, 1000)
  reason!: string;
}
