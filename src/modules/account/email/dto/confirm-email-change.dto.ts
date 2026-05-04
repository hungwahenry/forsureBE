import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'ech_019dd459a59b741a87cff971ebcebf58' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  challengeId!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
