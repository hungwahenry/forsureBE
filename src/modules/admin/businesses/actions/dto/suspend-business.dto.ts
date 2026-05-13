import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SuspendBusinessDto {
  @ApiProperty({ description: 'Reason for suspension (shown to admins).' })
  @IsString()
  @Length(3, 1000)
  reason!: string;
}
