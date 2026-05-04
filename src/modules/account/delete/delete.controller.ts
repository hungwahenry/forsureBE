import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { DeleteAccountService } from './delete.service';
import { DeleteMeDto } from './dto/delete-me.dto';

@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
export class DeleteAccountController {
  constructor(private readonly deleteAccount: DeleteAccountService) {}

  @Post('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Permanently delete the caller's account. Requires a step-up DELETE_ACCOUNT challenge id + code.",
  })
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteMeDto,
  ): Promise<void> {
    await this.deleteAccount.deleteMe(user.id, dto.challengeId, dto.code);
  }
}
