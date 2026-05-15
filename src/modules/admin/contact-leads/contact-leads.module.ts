import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminContactLeadsActionsController } from './actions/actions.controller';
import { AdminContactLeadsActionsService } from './actions/actions.service';
import { AdminContactLeadsDetailController } from './detail/detail.controller';
import { AdminContactLeadsDetailService } from './detail/detail.service';
import { AdminContactLeadsListController } from './list/list.controller';
import { AdminContactLeadsListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminContactLeadsListController,
    AdminContactLeadsDetailController,
    AdminContactLeadsActionsController,
  ],
  providers: [
    AdminContactLeadsListService,
    AdminContactLeadsDetailService,
    AdminContactLeadsActionsService,
  ],
})
export class AdminContactLeadsModule {}
