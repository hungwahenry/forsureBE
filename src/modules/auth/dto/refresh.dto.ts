import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token (64-char hex).' })
  @IsString()
  @Length(64, 64)
  refreshToken!: string;
}
