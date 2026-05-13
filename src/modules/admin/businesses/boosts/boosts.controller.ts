import {
  Body,
  Controller,
  Get,
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
import { AdminBusinessBoostsService } from './boosts.service';
import { ReasonDto } from './dto/reason.dto';

@ApiTags('Admin / Businesses')
@ApiBearerAuth()
@Controller('admin/businesses')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessBoostsController {
  constructor(private readonly service: AdminBusinessBoostsService) {}

  @Get(':id/boosts')
  @ApiOperation({
    summary: "Boosts run by the business (active + historical).",
  })
  list(@Param('id') id: string) {
    return this.service.list(id);
  }

  @Post('boosts/:boostId/force-cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Force-cancel an active boost. No refund — the business is still billed for the included slot / overage already charged.',
  })
  async forceCancel(
    @Param('boostId') boostId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReasonDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.forceCancel(boostId, dto, {
      adminId: admin.id,
      request: req,
    });
  }
}
