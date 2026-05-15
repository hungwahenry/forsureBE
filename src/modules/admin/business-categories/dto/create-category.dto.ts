import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateBusinessCategoryDto {
  @ApiProperty({
    description: 'Unique code, e.g. FOOD_DRINK. SCREAMING_SNAKE convention.',
  })
  @IsString()
  @Length(2, 64)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be uppercase letters, digits, and underscores.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  code!: string;

  @ApiProperty({ description: 'Human label shown to owners and consumers.' })
  @IsString()
  @Length(1, 64)
  label!: string;

  @ApiPropertyOptional({ description: 'Optional one-line description.' })
  @IsOptional()
  @IsString()
  @Length(0, 280)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Optional icon name from the shared icon set (mobile/web map it to a component). Defer-rendering today.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  iconName?: string;

  @ApiPropertyOptional({
    description: 'Shown to owners in the picker if true.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in pickers (lower comes first).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
