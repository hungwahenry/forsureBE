import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../decorators/skip-onboarding.decorator';
import { AppConfigService } from './app-config.service';

@ApiTags('Config')
@ApiBearerAuth()
@Controller('config')
@SkipOnboarding()
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary:
      'Client-exposed config values so clients can mirror server-side validation.',
  })
  async list(): Promise<{
    config: Record<string, number | boolean | string>;
  }> {
    return { config: await this.appConfig.listClientExposed() };
  }
}
