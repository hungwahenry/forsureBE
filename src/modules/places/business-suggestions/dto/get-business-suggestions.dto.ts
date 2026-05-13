import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class GetBusinessSuggestionsDto {
  @ApiProperty({ example: 6.4541, description: "User's current latitude." })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 3.3947, description: "User's current longitude." })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description:
      'Whatever the user has typed in the place picker so far. Omitted or empty returns the closest venues with no keyword filter.',
    example: 'yoga',
  })
  @IsOptional()
  @IsString()
  @Length(0, 256)
  q?: string;
}
