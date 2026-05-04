import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class StartStepUpDto {
  @ApiProperty({ example: 'DELETE_ACCOUNT' })
  @IsString()
  @MinLength(1)
  action!: string;
}
