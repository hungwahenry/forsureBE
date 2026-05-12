import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminBlocksActionsController } from './actions/actions.controller';
import { AdminBlocksActionsService } from './actions/actions.service';
import { AdminBlocksListController } from './list/list.controller';
import { AdminBlocksListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminBlocksListController, AdminBlocksActionsController],
  providers: [AdminBlocksListService, AdminBlocksActionsService],
})
export class AdminBlocksModule {}
