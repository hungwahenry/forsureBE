import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "User's full notification preference matrix with code-level defaults overlaid.",
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.list(user.id);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upsert one or more (event, channel, enabled) preference rows. Returns the resolved matrix.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferences.update(user.id, dto.updates);
  }
}
