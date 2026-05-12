import { Module } from '@nestjs/common';
import { AdminActivitiesModule } from './activities/activities.module';
import { AdminMeModule } from './me/me.module';
import { AdminMessagesModule } from './messages/messages.module';
import { AdminPostsModule } from './posts/posts.module';
import { AdminReportsModule } from './reports/reports.module';
import { AdminUsersModule } from './users/users.module';

@Module({
  imports: [
    AdminMeModule,
    AdminUsersModule,
    AdminReportsModule,
    AdminMessagesModule,
    AdminPostsModule,
    AdminActivitiesModule,
  ],
})
export class AdminModule {}
