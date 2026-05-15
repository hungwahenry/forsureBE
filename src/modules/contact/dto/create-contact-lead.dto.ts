import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateContactLeadDto {
  @ApiProperty({ example: 'Henry Ho' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'henry@forsure.fyi' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: 'Blue Bottle Coffee' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiProperty({ example: 'We run three cafés and want to be listed as venues.' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  /** Honeypot — hidden in the real form. Bots fill it; humans never do. */
  @ApiPropertyOptional({ description: 'Honeypot — leave empty.' })
  @IsOptional()
  @IsString()
  website?: string;

  /** Cloudflare Turnstile token from the widget. */
  @ApiPropertyOptional({ description: 'Cloudflare Turnstile response token.' })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
