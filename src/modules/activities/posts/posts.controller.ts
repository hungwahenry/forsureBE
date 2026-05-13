import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { UpsertPostDto } from './dto/upsert-post.dto';
import { POST_MAX_IMAGE_BYTES, POST_MAX_PHOTOS } from './posts.images';
import { ActivityPostsService } from './posts.service';

const fileInterceptor = FilesInterceptor('images', POST_MAX_PHOTOS, {
  limits: { fileSize: POST_MAX_IMAGE_BYTES },
});

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities/:activityId/posts')
export class ActivityPostsController {
  constructor(private readonly posts: ActivityPostsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List memory posts on an activity. Non-participants only see PUBLIC posts on shareable, DONE activities.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.posts.listPosts(user.id, activityId);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the viewer's own post for prefill, or null." })
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
  ) {
    return this.posts.getMyPost(user.id, activityId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(fileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        visibility: { type: 'string', enum: ['PARTICIPANTS', 'PUBLIC'] },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary: "Create the viewer's memory post (one per activity).",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Body() dto: UpsertPostDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    return this.posts.upsertPost(user.id, activityId, dto, images);
  }

  @Patch(':postId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(fileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        visibility: { type: 'string', enum: ['PARTICIPANTS', 'PUBLIC'] },
        keepPhotoIds: { type: 'array', items: { type: 'string' } },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary: "Edit the viewer's post (caption, visibility, photos).",
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Body() dto: UpsertPostDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    return this.posts.upsertPost(user.id, activityId, dto, images);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post. Author or host only.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId') activityId: string,
    @Param('postId') postId: string,
  ) {
    return this.posts.deletePost(user.id, activityId, postId);
  }
}
