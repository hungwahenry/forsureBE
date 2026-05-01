import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ChatsService } from './chats.service';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List the viewer's chats (one per activity they host or joined).",
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chats.listChats(user.id);
  }

  @Get(':activityId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paginate chat messages newest-first; cursor walks backwards.',
  })
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Query() dto: ListMessagesDto,
  ) {
    return this.chats.listMessages(user.id, activityId, dto);
  }

  @Post(':activityId/messages')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        parentMessageId: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Send a chat message (text and/or image).' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Body() dto: SendMessageDto,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: false }))
    image: Express.Multer.File | undefined,
  ) {
    return this.chats.sendMessage(user.id, activityId, dto, image);
  }

  @Delete(':activityId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Hard-delete a message. Sender or host only.',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chats.deleteMessage(user.id, activityId, messageId);
  }

  @Post(':activityId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark the chat as read up to now.' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.chats.markRead(user.id, activityId);
  }
}
