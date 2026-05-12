import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminSessionsActionsController } from './actions/actions.controller';
import { AdminSessionsActionsService } from './actions/actions.service';
import { AdminSessionsListController } from './list/list.controller';
import { AdminSessionsListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminSessionsListController, AdminSessionsActionsController],
  providers: [AdminSessionsListService, AdminSessionsActionsService],
})
export class AdminSessionsModule {}
