import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReasonsDto } from './dto/list-reasons.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reasons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List active report reasons applicable to a target type.',
  })
  listReasons(@Query() dto: ListReasonsDto) {
    return this.reports.listReasons(dto.targetType);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit a report against a user, activity, or message. One per (reporter, target) — re-submitting updates the reason/details.',
  })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reports.submitReport(user.id, dto);
  }
}
