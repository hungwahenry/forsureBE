import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminPostsActionsController } from './actions/actions.controller';
import { AdminPostsActionsService } from './actions/actions.service';
import { AdminPostsDetailController } from './detail/detail.controller';
import { AdminPostsDetailService } from './detail/detail.service';
import { AdminPostsListController } from './list/list.controller';
import { AdminPostsListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminPostsListController,
    AdminPostsDetailController,
    AdminPostsActionsController,
  ],
  providers: [
    AdminPostsListService,
    AdminPostsDetailService,
    AdminPostsActionsService,
  ],
})
export class AdminPostsModule {}
