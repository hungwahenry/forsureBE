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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MAX_IMAGE_BYTES } from './messages.images';
import { MessagesService } from './messages.service';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats/:activityId')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paginate chat messages newest-first; cursor walks backwards.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Query() dto: ListMessagesDto,
  ) {
    return this.messages.listMessages(user.id, activityId, dto);
  }

  @Post('messages')
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
    return this.messages.sendMessage(user.id, activityId, dto, image);
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard-delete a message. Sender or host only.' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messages.deleteMessage(user.id, activityId, messageId);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark the chat as read up to now.' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.messages.markRead(user.id, activityId);
  }
}
