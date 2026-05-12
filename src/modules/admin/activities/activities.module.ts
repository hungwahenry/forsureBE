import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminActivitiesActionsController } from './actions/actions.controller';
import { AdminActivitiesActionsService } from './actions/actions.service';
import { AdminActivitiesDetailController } from './detail/detail.controller';
import { AdminActivitiesDetailService } from './detail/detail.service';
import { AdminActivitiesListController } from './list/list.controller';
import { AdminActivitiesListService } from './list/list.service';
import { AdminActivityMessagesController } from './messages/messages.controller';
import { AdminActivityMessagesService } from './messages/messages.service';
import { AdminActivityParticipantsController } from './participants/participants.controller';
import { AdminActivityParticipantsService } from './participants/participants.service';
import { AdminActivityPostsController } from './posts/posts.controller';
import { AdminActivityPostsService } from './posts/posts.service';
import { AdminActivityReportsController } from './reports/reports.controller';
import { AdminActivityReportsService } from './reports/reports.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminActivitiesListController,
    AdminActivitiesDetailController,
    AdminActivityParticipantsController,
    AdminActivityMessagesController,
    AdminActivityPostsController,
    AdminActivityReportsController,
    AdminActivitiesActionsController,
  ],
  providers: [
    AdminActivitiesListService,
    AdminActivitiesDetailService,
    AdminActivityParticipantsService,
    AdminActivityMessagesService,
    AdminActivityPostsService,
    AdminActivityReportsService,
    AdminActivitiesActionsService,
  ],
})
export class AdminActivitiesModule {}
