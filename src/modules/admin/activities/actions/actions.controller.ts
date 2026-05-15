import {
  Body,
  Controller,
  Delete,
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
} from '../../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminActivitiesActionsService } from './actions.service';
import { AdminEditActivityDto } from './dto/edit-activity.dto';
import { ReasonDto } from './dto/reason.dto';
import { ReassignHostDto } from './dto/reassign-host.dto';
import { TakedownDto } from './dto/takedown.dto';

@ApiTags('Admin / Activities')
@ApiBearerAuth()
@Controller('admin/activities')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminActivitiesActionsController {
  constructor(private readonly service: AdminActivitiesActionsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Admin takedown of an activity (soft-delete; distinct from user-initiated CANCELLED).',
  })
  async takedown(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: TakedownDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.takedown(id, dto, { adminId: admin.id, request: req });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Force-cancel an OPEN/FULL activity.' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.cancel(id, dto, { adminId: admin.id, request: req });
  }

  @Post(':id/mark-done')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Force-DONE an OPEN/FULL activity.' })
  async markDone(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.markDone(id, dto, { adminId: admin.id, request: req });
  }

  @Post(':id/reassign-host')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Demote current host to MEMBER and promote a member to HOST. New host must already be a participant.',
  })
  async reassignHost(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReassignHostDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.reassignHost(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Edit activity fields (emoji/title/startsAt/capacity/memoriesShareablePublicly).',
  })
  async edit(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminEditActivityDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.edit(id, dto, { adminId: admin.id, request: req });
  }
}
