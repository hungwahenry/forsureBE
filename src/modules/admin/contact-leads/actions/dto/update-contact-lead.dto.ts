import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CONTACT_LEAD_STATUSES } from '../../contact-lead.constants';

export class UpdateContactLeadDto {
  @ApiProperty({ enum: CONTACT_LEAD_STATUSES })
  @IsIn(CONTACT_LEAD_STATUSES)
  status!: string;
}
