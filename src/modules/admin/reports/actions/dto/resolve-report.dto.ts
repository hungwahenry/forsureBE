import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ResolveReportDto {
  @ApiPropertyOptional({
    description: 'Optional resolution notes recorded in the audit log.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

export class DismissReportDto {
  @ApiPropertyOptional({
    description: 'Optional reason for dismissal recorded in the audit log.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;
}
