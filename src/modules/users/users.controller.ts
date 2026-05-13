import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ListUserActivitiesDto } from './dto/list-user-activities.dto';
import { ListUserPostsDto } from './dto/list-user-posts.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticated user's full profile + stats." })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getMyProfile(user.id);
  }

  @Get(':username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Public profile by username. Returns the self-shape when the viewer matches.',
  })
  byUsername(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
  ) {
    return this.users.getProfileByUsername(user.id, username);
  }

  @Get(':username/posts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Memory posts authored by the user. Strangers see only PUBLIC posts on shareable, DONE activities; self sees everything.',
  })
  posts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
    @Query() query: ListUserPostsDto,
  ) {
    return this.users.listPostsByUsername(user.id, username, query);
  }

  @Get(':username/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Past DONE activities the user attended. Strangers see only ones they hosted; self sees both hosted and joined.',
  })
  activities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
    @Query() query: ListUserActivitiesDto,
  ) {
    return this.users.listActivitiesByUsername(user.id, username, query);
  }
}
