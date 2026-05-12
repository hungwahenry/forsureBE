import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateFlagDto {
  @ApiProperty({
    description:
      'Stable lowercase snake_case key used in code, e.g. easter_eggs_enabled.',
  })
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'key must be lowercase snake_case (a-z, 0-9, _).',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  key!: string;

  @ApiPropertyOptional({ description: 'What this flag controls.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
