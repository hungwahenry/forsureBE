import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { InboxService } from './inbox.service';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List the viewer's chats (one per activity they host or joined).",
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.listChats(user.id);
  }
}
