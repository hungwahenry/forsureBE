import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../common/decorators/skip-onboarding.decorator';
import { FeatureFlagService } from '../../common/feature-flags/feature-flag.service';

@ApiTags('Feature flags')
@ApiBearerAuth()
@Controller('feature-flags')
@SkipOnboarding()
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  @Get()
  @ApiOperation({
    summary:
      'Client-exposed feature flags so the mobile UI can mirror server gating.',
  })
  async list(): Promise<{ flags: Record<string, boolean> }> {
    const flags = await this.featureFlags.listClientExposed();
    return { flags };
  }
}
