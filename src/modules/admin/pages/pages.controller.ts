import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { AdminPagesService } from './pages.service';

@ApiTags('Admin / Pages')
@ApiBearerAuth()
@Controller('admin/pages')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminPagesController {
  constructor(private readonly service: AdminPagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all admin pages (draft + published).' })
  list() {
    return this.service.list();
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Fetch a single page including its TipTap JSON and sanitized HTML.',
  })
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new page. Always created in DRAFT state.',
  })
  create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreatePageDto,
    @Req() req: Request,
  ) {
    return this.service.create(dto, { adminId: admin.id, request: req });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update slug, title, or body.' })
  update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdatePageDto,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, { adminId: admin.id, request: req });
  }

  @Post(':id/publish')
  @ApiOperation({
    summary:
      'Flip status to PUBLISHED. Sets publishedAt on first publish; subsequent re-publishes preserve the original publishedAt.',
  })
  publish(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.publish(id, { adminId: admin.id, request: req });
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Flip status back to DRAFT.' })
  unpublish(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.unpublish(id, { adminId: admin.id, request: req });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a page.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(id, { adminId: admin.id, request: req });
  }
}
