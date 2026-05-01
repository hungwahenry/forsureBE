import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ActivityDetailsService } from './details.service';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities/:id')
export class ActivityDetailsController {
  constructor(private readonly details: ActivityDetailsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Full activity details (members + host only). Used by the chat details screen.',
  })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') activityId: string) {
    return this.details.getDetails(user.id, activityId);
  }
}
