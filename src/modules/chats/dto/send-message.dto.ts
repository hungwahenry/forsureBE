import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const MESSAGE_MAX_LENGTH = 2000;

export class SendMessageDto {
  @ApiPropertyOptional({
    description:
      'Message body. Either body or image must be provided (or both).',
    maxLength: MESSAGE_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MESSAGE_MAX_LENGTH)
  body?: string;

  @ApiPropertyOptional({
    description: 'ID of a message in the same chat to reply to.',
  })
  @IsOptional()
  @IsString()
  parentMessageId?: string;
}
