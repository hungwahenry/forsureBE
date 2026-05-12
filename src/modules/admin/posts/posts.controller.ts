import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
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
import { TakedownDto } from './dto/takedown.dto';
import { AdminPostsService } from './posts.service';

@ApiTags('Admin / Posts')
@ApiBearerAuth()
@Controller('admin/posts')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminPostsController {
  constructor(private readonly service: AdminPostsService) {}

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
}
