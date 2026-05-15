import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({
    description:
      'New value. Validated server-side against the parameter type and bounds.',
  })
  @IsDefined()
  value!: number | boolean | string;
}
