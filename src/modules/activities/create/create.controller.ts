import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CreateActivityService } from './create.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class CreateActivityController {
  constructor(private readonly create: CreateActivityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new activity (the post)' })
  createActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActivityDto,
  ) {
    return this.create.create(user.id, dto);
  }
}
