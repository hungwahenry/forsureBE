import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { USERNAME_PATTERN } from './check-username.dto';
import { LocationDto } from './location.dto';

export class CompleteOnboardingDto {
  @ApiProperty({ example: 'henry' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 20)
  @Matches(USERNAME_PATTERN)
  username!: string;

  @ApiProperty({ example: 'Henry' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 50)
  displayName!: string;

  @ApiProperty({ example: '2000-01-01' })
  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({
    description:
      'Storage key returned by POST /onboarding/avatar. Required.',
  })
  @IsString()
  @Length(1, 200)
  avatarKey!: string;

  @ApiProperty({ type: () => LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;
}
