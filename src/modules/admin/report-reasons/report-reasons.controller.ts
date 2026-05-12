import {
  Body,
  Controller,
  Delete,
  Get,
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
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { CreateReportReasonDto } from './dto/create-reason.dto';
import { UpdateReportReasonDto } from './dto/update-reason.dto';
import { AdminReportReasonsService } from './report-reasons.service';

@ApiTags('Admin / Report Reasons')
@ApiBearerAuth()
@Controller('admin/report-reasons')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminReportReasonsController {
  constructor(private readonly service: AdminReportReasonsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all report reasons (active + inactive), with usage counts.',
  })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new report reason.' })
  create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateReportReasonDto,
    @Req() req: Request,
  ) {
    return this.service.create(dto, { adminId: admin.id, request: req });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a report reason.' })
  update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateReportReasonDto,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, { adminId: admin.id, request: req });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a report reason. 409 if any reports reference it (deactivate instead).',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(id, { adminId: admin.id, request: req });
  }
}
