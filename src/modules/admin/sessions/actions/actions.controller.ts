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
} from '../../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../../shared/admin.guard';
import { AdminSessionsActionsService } from './actions.service';
import { ReasonDto } from './dto/reason.dto';

@ApiTags('Admin / Sessions')
@ApiBearerAuth()
@Controller('admin/sessions')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminSessionsActionsController {
  constructor(private readonly service: AdminSessionsActionsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a single refresh-token session.' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.revoke(id, dto, { adminId: admin.id, request: req });
  }
}
