import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
