import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminPostsActionsService } from './actions.service';
import { AdminEditPostDto } from './dto/edit-post.dto';
import { TakedownDto } from './dto/takedown.dto';

@ApiTags('Admin / Posts')
@ApiBearerAuth()
@Controller('admin/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminPostsActionsController {
  constructor(private readonly service: AdminPostsActionsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin takedown of a memory post (soft-delete with attribution).',
  })
  async takedown(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: TakedownDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.takedown(id, dto, { adminId: admin.id, request: req });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Edit post fields (visibility override).' })
  async edit(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminEditPostDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.edit(id, dto, { adminId: admin.id, request: req });
  }
}
