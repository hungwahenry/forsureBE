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
import { AdminFeatureFlagsActionsService } from './actions.service';
import { CreateFlagDto } from './dto/create-flag.dto';
import { UpdateFlagDto } from './dto/update-flag.dto';

@ApiTags('Admin / Feature flags')
@ApiBearerAuth()
@Controller('admin/feature-flags')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminFeatureFlagsActionsController {
  constructor(private readonly service: AdminFeatureFlagsActionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag.' })
  create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateFlagDto,
    @Req() req: Request,
  ) {
    return this.service.create(dto, { adminId: admin.id, request: req });
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Toggle a flag or edit its description.' })
  update(
    @Param('key') key: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateFlagDto,
    @Req() req: Request,
  ) {
    return this.service.update(key, dto, { adminId: admin.id, request: req });
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag.' })
  async remove(
    @Param('key') key: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(key, { adminId: admin.id, request: req });
  }
}
