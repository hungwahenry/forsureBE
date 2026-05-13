import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { AdminBroadcastActionsService } from './actions.service';
import { BroadcastAudienceDto, BroadcastDto } from './dto/broadcast.dto';

@ApiTags('Admin / Broadcast')
@ApiBearerAuth()
@Controller('admin/broadcast')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBroadcastActionsController {
  constructor(private readonly service: AdminBroadcastActionsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve audience to a recipient count + sample (no send).',
  })
  preview(@Body() audience: BroadcastAudienceDto) {
    return this.service.preview(audience);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Enqueue a broadcast push notification. Returns the broadcastId + resolved recipient count.',
  })
  send(
    @Body() dto: BroadcastDto,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.send(dto, { adminId: admin.id, request: req });
  }
}
