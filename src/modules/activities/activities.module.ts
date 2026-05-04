import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
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
import { AutoDoneScheduler } from './scheduled/auto-done.scheduler';
import { ActivityStartReminderScheduler } from './scheduled/start-reminder.scheduler';

@Module({
  imports: [ChatsModule, NotificationsModule, BlocksModule],
  controllers: [
    CreateActivityController,
    JoinActivityController,
    ManageActivityController,
    ActivityDetailsController,
    ActivityPostsController,
  ],
  providers: [
    CreateActivityService,
    JoinActivityService,
    ManageActivityService,
    ActivityDetailsService,
    AutoDoneScheduler,
    ActivityStartReminderScheduler,
    ActivityPostsService,
  ],
  exports: [CreateActivityService, JoinActivityService, ActivityPostsService],
})
export class ActivitiesModule {}
