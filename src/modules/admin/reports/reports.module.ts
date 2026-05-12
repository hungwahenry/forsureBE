import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminReportsActionsController } from './actions/actions.controller';
import { AdminReportsActionsService } from './actions/actions.service';
import { AdminReportsDetailController } from './detail/detail.controller';
import { AdminReportsDetailService } from './detail/detail.service';
import { AdminReportsListController } from './list/list.controller';
import { AdminReportsListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminReportsListController,
    AdminReportsDetailController,
    AdminReportsActionsController,
  ],
  providers: [
    AdminReportsListService,
    AdminReportsDetailService,
    AdminReportsActionsService,
  ],
})
export class AdminReportsModule {}
