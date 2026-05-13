import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { JoinActivityService } from './join.service';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities/:id')
export class JoinActivityController {
  constructor(private readonly join: JoinActivityService) {}

  @Post('join')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Join an activity.' })
  async joinActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.join.join(user.id, id);
  }

  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave an activity (idempotent).' })
  async leaveActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.join.leave(user.id, id);
  }
}
