import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class AdminEditProfileDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  displayName?: string;

  @ApiPropertyOptional({
    description: '3-20 chars, lowercase letters/digits/underscore.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message:
      'username must start with a letter and contain only lowercase letters, digits, or underscore.',
  })
  username?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;
}
