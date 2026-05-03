import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly devices: DevicesService,
    private readonly preferences: PreferencesService,
  ) {}

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Register or refresh an Expo push token for the calling user. Idempotent — call on every app launch.',
  })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.devices.register({
      userId: user.id,
      token: dto.token,
      platform: dto.platform,
    });
  }

  @Delete('devices/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Unregister this device's token. Best-effort cleanup on logout — failures don't block sign-out.",
  })
  async unregisterDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ): Promise<void> {
    await this.devices.unregister(user.id, token);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "User's full notification preference matrix with code-level defaults overlaid.",
  })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.list(user.id);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upsert one or more (event, channel, enabled) preference rows. Returns the resolved matrix.',
  })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferences.update(user.id, dto.updates);
  }
}
