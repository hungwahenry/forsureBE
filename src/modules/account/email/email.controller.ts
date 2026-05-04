import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { StartEmailChangeDto } from './dto/start-email-change.dto';
import { EmailChangeService } from './email.service';

@ApiTags('account')
@ApiBearerAuth()
@Controller('account/email')
export class EmailChangeController {
  constructor(private readonly emailChange: EmailChangeService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start an email change. Sends a one-time code to the new address; returns a challenge id.',
  })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartEmailChangeDto,
  ) {
    return this.emailChange.start(user.id, dto.newEmail);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirm the email change with the code from the new address. Returns the resolved MyProfile.',
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.emailChange.confirm(user.id, dto.challengeId, dto.code);
  }
}
