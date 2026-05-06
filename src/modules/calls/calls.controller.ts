import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';

@ApiTags('calls')
@ApiBearerAuth()
@Controller('activities/:id/call')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate a 100ms auth token for the requesting user to join the activity call. ' +
      'Returns { token, roomId }.',
  })
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') activityId: string,
  ) {
    return this.calls.join(user.id, activityId);
  }
}
