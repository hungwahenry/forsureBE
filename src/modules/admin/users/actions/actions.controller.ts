import {
  Body,
  Controller,
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
import { AdminUserActionsService } from './actions.service';
import { AdminEditProfileDto } from './dto/edit-profile.dto';
import { ReasonDto } from './dto/reason.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users/:id')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminUserActionsController {
  constructor(private readonly service: AdminUserActionsService) {}

  @Post('suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Suspend a user and revoke their active sessions.',
  })
  async suspend(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: SuspendUserDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.suspend(id, dto, { adminId: admin.id, request: req });
  }

  @Post('unsuspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Lift a suspension and restore ACTIVE status.' })
  async unsuspend(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.unsuspend(id, dto, { adminId: admin.id, request: req });
  }

  @Post('force-logout')
  @ApiOperation({
    summary: 'Revoke every active refresh token for the user.',
  })
  forceLogout(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<{ revokedCount: number }> {
    return this.service.forceLogout(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }

  @Post('trigger-data-export')
  @ApiOperation({
    summary: "Enqueue a data export job on the user's behalf.",
  })
  triggerDataExport(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ exportRequestId: string }> {
    return this.service.triggerDataExport(id, {
      adminId: admin.id,
      request: req,
    });
  }

  @Patch('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Edit the user's profile (displayName / username / bio).",
  })
  async editProfile(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminEditProfileDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.editProfile(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }
}
