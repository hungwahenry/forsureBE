import { Module } from '@nestjs/common';
import { AdminActivitiesModule } from './activities/activities.module';
import { AdminMeModule } from './me/me.module';
import { AdminMessagesModule } from './messages/messages.module';
import { AdminPostsModule } from './posts/posts.module';
import { AdminReportReasonsModule } from './report-reasons/report-reasons.module';
import { AdminReportsModule } from './reports/reports.module';
import { AdminQueuesModule } from './system/queues/queues.module';
import { AdminUsersModule } from './users/users.module';

@Module({
  imports: [
    AdminMeModule,
    AdminUsersModule,
    AdminReportsModule,
    AdminReportReasonsModule,
    AdminMessagesModule,
    AdminPostsModule,
    AdminActivitiesModule,
    AdminQueuesModule,
  ],
})
export class AdminModule {}
