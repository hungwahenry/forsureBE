import {
  Body,
  Controller,
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
import { AdminConfigActionsService } from './actions.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('Admin / Config')
@ApiBearerAuth()
@Controller('admin/config')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminConfigActionsController {
  constructor(private readonly service: AdminConfigActionsService) {}

  @Patch(':key')
  @ApiOperation({ summary: 'Change a config parameter value.' })
  update(
    @Param('key') key: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateConfigDto,
    @Req() req: Request,
  ) {
    return this.service.update(key, dto.value, {
      adminId: admin.id,
      request: req,
    });
  }

  @Post(':key/reset')
  @ApiOperation({ summary: 'Reset a config parameter to its seeded default.' })
  reset(
    @Param('key') key: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.reset(key, { adminId: admin.id, request: req });
  }
}
