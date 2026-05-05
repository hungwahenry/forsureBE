import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { ActivityPreviewService } from './preview.service';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities/:id/preview')
export class ActivityPreviewController {
  constructor(private readonly preview: ActivityPreviewService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Public-facing activity summary for share-link landing screens. Available to any authenticated user (no membership required).',
  })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') activityId: string) {
    return this.preview.getPreview(user.id, activityId);
  }
}
