import { Module } from '@nestjs/common';
import { AdminActivitiesModule } from './activities/activities.module';
import { AdminAuditLogModule } from './audit-log/audit-log.module';
import { AdminBlocksModule } from './blocks/blocks.module';
import { AdminBroadcastModule } from './broadcast/broadcast.module';
import { AdminFeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AdminMeModule } from './me/me.module';
import { AdminMessagesModule } from './messages/messages.module';
import { AdminPostsModule } from './posts/posts.module';
import { AdminReportReasonsModule } from './report-reasons/report-reasons.module';
import { AdminReportsModule } from './reports/reports.module';
import { AdminSessionsModule } from './sessions/sessions.module';
import { AdminCronModule } from './system/cron/cron.module';
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
    AdminBlocksModule,
    AdminSessionsModule,
    AdminQueuesModule,
    AdminCronModule,
    AdminFeatureFlagsModule,
    AdminAuditLogModule,
    AdminBroadcastModule,
  ],
})
export class AdminModule {}
