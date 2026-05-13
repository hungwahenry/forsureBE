import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { BusinessModule } from '../business/business.module';
import { ChatsModule } from '../chats/chats.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CreateActivityController } from './create/create.controller';
import { CreateActivityService } from './create/create.service';
import { ActivityDetailsController } from './details/details.controller';
import { ActivityDetailsService } from './details/details.service';
import { JoinActivityController } from './join/join.controller';
import { JoinActivityService } from './join/join.service';
import { ManageActivityController } from './manage/manage.controller';
import { ManageActivityService } from './manage/manage.service';
import { ActivityPostsController } from './posts/posts.controller';
import { ActivityPostsService } from './posts/posts.service';
import { ActivityPreviewController } from './preview/preview.controller';
import { ActivityPreviewService } from './preview/preview.service';
import { AutoDoneScheduler } from './scheduled/auto-done.scheduler';
import { ActivityStartReminderScheduler } from './scheduled/start-reminder.scheduler';

@Module({
  imports: [ChatsModule, NotificationsModule, BlocksModule, BusinessModule],
  controllers: [
    CreateActivityController,
    JoinActivityController,
    ManageActivityController,
    ActivityDetailsController,
    ActivityPreviewController,
    ActivityPostsController,
  ],
  providers: [
    CreateActivityService,
    JoinActivityService,
    ManageActivityService,
    ActivityDetailsService,
    ActivityPreviewService,
    AutoDoneScheduler,
    ActivityStartReminderScheduler,
    ActivityPostsService,
  ],
  exports: [CreateActivityService, JoinActivityService, ActivityPostsService],
})
export class ActivitiesModule {}
