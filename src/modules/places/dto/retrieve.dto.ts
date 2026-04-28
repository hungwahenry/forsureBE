import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RetrievePlaceDto {
  @ApiProperty({
    description:
      'Same UUID used for the preceding suggest calls — completes the session.',
  })
  @IsUUID('4')
  sessionToken!: string;
}
