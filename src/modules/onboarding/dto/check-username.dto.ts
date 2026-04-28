import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export class CheckUsernameDto {
  @ApiProperty({ example: 'henry' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 20)
  @Matches(USERNAME_PATTERN, {
    message:
      'username must be 3-20 chars, start with a letter, and contain only lowercase letters, digits, or underscores',
  })
  username!: string;
}
