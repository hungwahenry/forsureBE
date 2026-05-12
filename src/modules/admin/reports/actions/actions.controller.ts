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
import { AdminReportsActionsService } from './actions.service';
import {
  DismissReportDto,
  ResolveReportDto,
} from './dto/resolve-report.dto';

@ApiTags('Admin / Reports')
@ApiBearerAuth()
@Controller('admin/reports/:id')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminReportsActionsController {
  constructor(private readonly service: AdminReportsActionsService) {}

  @Post('resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark a pending report as REVIEWED.',
  })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ResolveReportDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.resolve(id, dto, { adminId: admin.id, request: req });
  }

  @Post('dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark a pending report as DISMISSED.',
  })
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: DismissReportDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.dismiss(id, dto, { adminId: admin.id, request: req });
  }
}
