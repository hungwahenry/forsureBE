import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { StartStepUpDto } from './dto/start-step-up.dto';
import { StepUpService } from './step-up.service';

@ApiTags('step-up')
@ApiBearerAuth()
@Controller('step-up')
export class StepUpController {
  constructor(private readonly stepUp: StepUpService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start a step-up challenge for a sensitive action. Emails an OTP and returns a challenge id; the action endpoint then takes { challengeId, code }.',
  })
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartStepUpDto) {
    return this.stepUp.start(user.id, dto.action);
  }
}
