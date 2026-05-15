import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, Length, MinDate } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ description: 'Reason for suspension (shown to admins).' })
  @IsString()
  @Length(3, 1000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'When the suspension automatically lifts. Omit for indefinite.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  until?: Date;
}
