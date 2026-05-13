import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { CreditsService } from './credits.service';

@ApiTags('Eggs')
@ApiBearerAuth()
@Controller('eggs/credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Post('discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record (or recall) the user discovering the credits egg. Returns their rank.',
  })
  discover(@CurrentUser() user: AuthenticatedUser) {
    return this.credits.discover(user.id);
  }
}
