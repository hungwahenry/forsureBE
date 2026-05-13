import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { EditActivityDto } from './dto/edit-activity.dto';
import { ManageActivityService } from './manage.service';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities/:id')
export class ManageActivityController {
  constructor(private readonly manage: ManageActivityService) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Edit an activity (host only). Field rules enforced server-side.',
  })
  edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') activityId: string,
    @Body() dto: EditActivityDto,
  ) {
    return this.manage.edit(user.id, activityId, dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancel an activity (host only). Posts a system message and locks the chat.',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') activityId: string,
  ) {
    return this.manage.cancel(user.id, activityId);
  }

  @Delete('participants/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member from an activity (host only).',
  })
  kick(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') activityId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.manage.kick(user.id, activityId, targetUserId);
  }
}
