import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  placeName!: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Henry' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName?: string;

  @ApiPropertyOptional({ example: 'always down for spontaneous brunch.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(280)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Replace the stored location. Pass all three or none.',
    type: () => UpdateLocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;
}
