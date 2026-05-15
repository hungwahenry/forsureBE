import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AdminContactLeadsActionsService } from './actions.service';
import { UpdateContactLeadDto } from './dto/update-contact-lead.dto';

@ApiTags('Admin / Contact leads')
@ApiBearerAuth()
@Controller('admin/contact-leads')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminContactLeadsActionsController {
  constructor(private readonly service: AdminContactLeadsActionsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Change a contact lead status.' })
  update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateContactLeadDto,
    @Req() req: Request,
  ) {
    return this.service.updateStatus(id, dto, {
      adminId: admin.id,
      request: req,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a contact lead.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(id, { adminId: admin.id, request: req });
  }
}
