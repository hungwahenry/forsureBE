import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';

export enum BlockDirection {
  MADE = 'made',
  RECEIVED = 'received',
}

export class ListUserBlocksDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    enum: BlockDirection,
    default: BlockDirection.MADE,
    description:
      'made = blocks the user issued; received = blocks against them.',
  })
  @IsOptional()
  @IsEnum(BlockDirection)
  direction: BlockDirection = BlockDirection.MADE;
}
