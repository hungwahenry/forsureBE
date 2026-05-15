import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateBusinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @ApiPropertyOptional({ description: 'BusinessCategory id (must be active).' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Storage key returned by POST /business/logo. Replaces the current logo.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  logoKey?: string;

  @ApiPropertyOptional({
    description:
      'Storage key returned by POST /business/cover-photo. Replaces the current cover.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  coverPhotoKey?: string;

  @ApiPropertyOptional({ description: 'One-line description (max 280 chars).' })
  @IsOptional()
  @IsString()
  @Length(0, 280)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Public-facing support email.' })
  @IsOptional()
  @IsEmail()
  @Length(0, 256)
  supportEmail?: string;

  @ApiPropertyOptional({
    description: 'Public-facing support phone. Loose format — owner-typed.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  supportPhone?: string;
}
