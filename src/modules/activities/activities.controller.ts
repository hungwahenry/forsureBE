import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new activity (the post)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(user.id, dto);
  }
}
