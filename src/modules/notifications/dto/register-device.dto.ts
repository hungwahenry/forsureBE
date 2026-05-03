import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push token returned by getExpoPushTokenAsync().',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  token!: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.IOS })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
