import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class StartEmailChangeDto {
  @ApiProperty({ example: 'new@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  newEmail!: string;

  @ApiProperty({
    example: 'sup_019df...',
    description:
      'Step-up challenge id from POST /step-up/request action=CHANGE_EMAIL.',
  })
  @IsString()
  stepUpChallengeId!: string;

  @ApiProperty({
    example: '123456',
    description:
      'Code from the step-up email sent to the current email address.',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/)
  stepUpCode!: string;
}
