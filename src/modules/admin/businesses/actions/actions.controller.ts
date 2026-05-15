import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
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
import { AdminBusinessesActionsService } from './actions.service';
import { ReasonDto } from './dto/reason.dto';
import { SuspendBusinessDto } from './dto/suspend-business.dto';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses/:id')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessesActionsController {
  constructor(private readonly service: AdminBusinessesActionsService) {}

  @Post('suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Suspend a business. Stops their venues from appearing in suggestions, stops their boosts from appearing in the feed, and 403s their portal access.',
  })
  async suspend(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: SuspendBusinessDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.suspend(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }

  @Post('unsuspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Lift the suspension.' })
  async unsuspend(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.unsuspend(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }

  @Post('lift-auto-pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Lift an auto-pause that was triggered by 3+ distinct venue flags in 30d.',
  })
  async liftAutoPause(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.liftAutoPause(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }
}
