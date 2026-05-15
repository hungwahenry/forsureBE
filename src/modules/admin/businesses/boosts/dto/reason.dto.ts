import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ReasonDto {
  @ApiPropertyOptional({
    description: 'Optional reason recorded in audit log.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;
}
