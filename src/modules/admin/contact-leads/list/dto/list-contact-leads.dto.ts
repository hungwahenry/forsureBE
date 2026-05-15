import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CursorPaginationDto } from '../../../../../common/dto/pagination.dto';
import { CONTACT_LEAD_STATUSES } from '../../contact-lead.constants';

export class ListContactLeadsDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: CONTACT_LEAD_STATUSES })
  @IsOptional()
  @IsIn(CONTACT_LEAD_STATUSES)
  status?: string;
}
