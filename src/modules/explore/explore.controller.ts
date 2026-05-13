import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ExploreQueryDto } from './dto/explore.dto';
import { ExploreService } from './explore.service';

@ApiTags('Explore')
@ApiBearerAuth()
@Controller('explore')
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get('posts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Public memory posts from shareable, DONE activities within radius — newest first.',
  })
  listPosts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExploreQueryDto,
  ) {
    return this.explore.listPublicPosts(user.id, query);
  }
}
