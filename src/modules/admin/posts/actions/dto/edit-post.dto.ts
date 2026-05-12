import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class AdminEditPostDto {
  @ApiPropertyOptional({
    enum: PostVisibility,
    description:
      'Override the visibility (PARTICIPANTS = activity members only; PUBLIC = discoverable on explore).',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}
