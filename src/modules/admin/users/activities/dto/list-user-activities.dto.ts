import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ActivityRole } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export class ListUserActivitiesDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: ActivityRole })
  @IsOptional()
  @IsEnum(ActivityRole)
  role?: ActivityRole;
}
