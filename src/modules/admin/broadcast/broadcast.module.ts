import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminBroadcastActionsController } from './actions/actions.controller';
import { AdminBroadcastActionsService } from './actions/actions.service';

@Module({
  imports: [AdminSharedModule, NotificationsModule],
  controllers: [AdminBroadcastActionsController],
  providers: [AdminBroadcastActionsService],
})
export class AdminBroadcastModule {}
