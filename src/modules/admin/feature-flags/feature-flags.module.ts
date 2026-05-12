import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminFeatureFlagsActionsController } from './actions/actions.controller';
import { AdminFeatureFlagsActionsService } from './actions/actions.service';
import { AdminFeatureFlagsListController } from './list/list.controller';
import { AdminFeatureFlagsListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminFeatureFlagsListController,
    AdminFeatureFlagsActionsController,
  ],
  providers: [AdminFeatureFlagsListService, AdminFeatureFlagsActionsService],
})
export class AdminFeatureFlagsModule {}
