import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export class ListUsersDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description:
      'Search by email (substring), username (substring), or user id.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
