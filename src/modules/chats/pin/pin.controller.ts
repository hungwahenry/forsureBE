import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PinService } from './pin.service';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats/:activityId/pin')
export class PinController {
  constructor(private readonly pin: PinService) {}

  @Post(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Pin a message in the chat (host only).' })
  pinMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.pin.pin(user.id, activityId, messageId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpin the chat’s pinned message (host only).' })
  unpinMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.pin.unpin(user.id, activityId);
  }
}
