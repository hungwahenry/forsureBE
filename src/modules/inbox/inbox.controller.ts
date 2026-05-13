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
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { InboxService } from './inbox.service';

@ApiTags('Inbox')
@ApiBearerAuth()
@Controller('inbox')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Paginated inbox of the user's notifications." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsDto,
  ) {
    return this.inbox.list(user.id, query);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Count of unread notifications for the bell badge.',
  })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.inbox.unreadCount(user.id) };
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Mark notifications read. With ids: only those. Without: all unread.',
  })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkReadDto,
  ): Promise<void> {
    await this.inbox.markRead(user.id, dto);
  }
}
