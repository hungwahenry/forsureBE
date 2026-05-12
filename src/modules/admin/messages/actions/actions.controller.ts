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
import { AdminMessagesActionsService } from './actions.service';
import { TakedownDto } from './dto/takedown.dto';

@ApiTags('Admin / Messages')
@ApiBearerAuth()
@Controller('admin/messages')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminMessagesActionsController {
  constructor(private readonly service: AdminMessagesActionsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin takedown of a chat message (soft-delete with attribution).',
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
