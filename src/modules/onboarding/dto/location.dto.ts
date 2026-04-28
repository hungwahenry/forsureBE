import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class LocationDto {
  @ApiProperty({ example: 6.4541 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 3.3947 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  @IsString()
  @Length(1, 200)
  placeName!: string;
}
