import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export enum BroadcastAudienceKind {
  ALL = 'all',
  ROLE = 'role',
  USER_IDS = 'userIds',
}

export class BroadcastAudienceDto {
  @ApiProperty({ enum: BroadcastAudienceKind })
  @IsEnum(BroadcastAudienceKind)
  kind!: BroadcastAudienceKind;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'List of user ids when kind=userIds (max 5000).',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  userIds?: string[];
}

export class BroadcastMessageDto {
  @ApiProperty({ description: 'Push notification title.' })
  @IsString()
  @Length(1, 80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title!: string;

  @ApiProperty({ description: 'Push notification body.' })
  @IsString()
  @Length(1, 200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  body!: string;

  @ApiPropertyOptional({
    description:
      'Optional data payload (e.g. { route: "/activity/act_123" }) forwarded to the push notification.',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class BroadcastDto {
  @ApiProperty({ type: BroadcastAudienceDto })
  @ValidateNested()
  @Type(() => BroadcastAudienceDto)
  audience!: BroadcastAudienceDto;

  @ApiProperty({ type: BroadcastMessageDto })
  @ValidateNested()
  @Type(() => BroadcastMessageDto)
  message!: BroadcastMessageDto;
}
