import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Display name of the business.' })
  @IsString()
  @Length(2, 80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @ApiProperty({ description: 'BusinessCategory id (must be active).' })
  @IsString()
  @Length(1, 64)
  categoryId!: string;

  @ApiProperty({
    description:
      'Storage key returned by POST /business/onboarding/logo. Stamped as the business logo.',
  })
  @IsString()
  @Length(1, 256)
  logoKey!: string;

  @ApiPropertyOptional({
    description: 'One-line description shown on sponsored picker rows.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 280)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  shortDescription?: string;
}
