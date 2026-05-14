import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject, IsString, Length, Matches } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({
    description:
      'URL slug. Lowercase letters, digits, hyphens. e.g. "terms", "privacy".',
  })
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase letters/digits separated by single hyphens.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  slug!: string;

  @ApiProperty({ description: 'Human-readable page title.' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({
    description: 'TipTap document JSON (the editor.getJSON() output).',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  bodyJson!: Record<string, unknown>;

  @ApiProperty({
    description:
      'HTML produced by the editor (editor.getHTML()). Server sanitizes before storing.',
  })
  @IsString()
  bodyHtml!: string;
}
