import { Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
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

@Module({
  imports: [ChatsModule],
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
    ActivityPostsService,
  ],
  exports: [CreateActivityService, JoinActivityService, ActivityPostsService],
})
export class ActivitiesModule {}
