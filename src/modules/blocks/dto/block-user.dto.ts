import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ example: 'usr_019dd459a59b741a87cff971ebcebf58' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId!: string;
}
