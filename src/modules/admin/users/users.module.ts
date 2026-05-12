import { Module } from '@nestjs/common';
import { DataExportModule } from '../../account/export/export.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminUserActionsController } from './actions/actions.controller';
import { AdminUserActionsService } from './actions/actions.service';
import { AdminUserActivitiesController } from './activities/activities.controller';
import { AdminUserActivitiesService } from './activities/activities.service';
import { AdminUserBlocksController } from './blocks/blocks.controller';
import { AdminUserBlocksService } from './blocks/blocks.service';
import { AdminUsersDetailController } from './detail/detail.controller';
import { AdminUsersDetailService } from './detail/detail.service';
import { AdminUsersListController } from './list/list.controller';
import { AdminUsersListService } from './list/list.service';
import { AdminUserMessagesController } from './messages/messages.controller';
import { AdminUserMessagesService } from './messages/messages.service';
import { AdminUserPostsController } from './posts/posts.controller';
import { AdminUserPostsService } from './posts/posts.service';
import { AdminUserReportsController } from './reports/reports.controller';
import { AdminUserReportsService } from './reports/reports.service';
import { AdminUserSessionsController } from './sessions/sessions.controller';
import { AdminUserSessionsService } from './sessions/sessions.service';

@Module({
  imports: [AdminSharedModule, DataExportModule],
  controllers: [
    AdminUsersListController,
    AdminUsersDetailController,
    AdminUserActivitiesController,
    AdminUserMessagesController,
    AdminUserPostsController,
    AdminUserReportsController,
    AdminUserBlocksController,
    AdminUserSessionsController,
    AdminUserActionsController,
  ],
  providers: [
    AdminUsersListService,
    AdminUsersDetailService,
    AdminUserActivitiesService,
    AdminUserMessagesService,
    AdminUserPostsService,
    AdminUserReportsService,
    AdminUserBlocksService,
    AdminUserSessionsService,
    AdminUserActionsService,
  ],
})
export class AdminUsersModule {}
