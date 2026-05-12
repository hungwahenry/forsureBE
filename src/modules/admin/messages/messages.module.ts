import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminMessagesActionsController } from './actions/actions.controller';
import { AdminMessagesActionsService } from './actions/actions.service';
import { AdminMessagesListController } from './list/list.controller';
import { AdminMessagesListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminMessagesListController, AdminMessagesActionsController],
  providers: [AdminMessagesListService, AdminMessagesActionsService],
})
export class AdminMessagesModule {}
