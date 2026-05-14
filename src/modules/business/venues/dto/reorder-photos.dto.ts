import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderVenuePhotosDto {
  @ApiProperty({
    description:
      'Photo ids in the desired display order. Must include every current photo exactly once.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  photoIds!: string[];
}
