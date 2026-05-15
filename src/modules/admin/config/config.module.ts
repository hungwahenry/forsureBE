import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminConfigActionsController } from './actions/actions.controller';
import { AdminConfigActionsService } from './actions/actions.service';
import { AdminConfigListController } from './list/list.controller';
import { AdminConfigListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminConfigListController, AdminConfigActionsController],
  providers: [AdminConfigListService, AdminConfigActionsService],
})
export class AdminConfigModule {}
