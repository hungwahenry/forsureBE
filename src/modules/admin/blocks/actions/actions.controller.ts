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
import { AdminBlocksActionsService } from './actions.service';
import { ReasonDto } from './dto/reason.dto';

@ApiTags('Admin / Blocks')
@ApiBearerAuth()
@Controller('admin/blocks')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBlocksActionsController {
  constructor(private readonly service: AdminBlocksActionsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a user block as an admin override (audited).',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(id, dto, { adminId: admin.id, request: req });
  }
}
