import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PublicPagesService } from './public-pages.service';

@ApiTags('Pages')
@Controller('pages')
export class PublicPagesController {
  constructor(private readonly service: PublicPagesService) {}

  @Public()
  @Get('footer')
  @ApiOperation({
    summary:
      'List published pages marked showInFooter=true, ordered for rendering in the shared site footer.',
  })
  footer() {
    return this.service.listFooterLinks();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary:
      'Fetch a published admin page by slug. 404s on drafts or unknown slugs.',
  })
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }
}
