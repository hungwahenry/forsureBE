import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { FeedQueryDto } from './dto/feed.dto';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Discover activities — gender-filtered, geo-bounded, ordered by 12h-bucket then distance.',
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FeedQueryDto) {
    return this.feed.getFeed(user.id, query);
  }
}
