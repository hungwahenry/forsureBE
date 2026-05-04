import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InboxController } from './inbox/inbox.controller';
import { InboxService } from './inbox/inbox.service';
import { MembershipService } from './membership/membership.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { PinController } from './pin/pin.controller';
import { PinService } from './pin/pin.service';

@Module({
  imports: [NotificationsModule, BlocksModule],
  controllers: [InboxController, MessagesController, PinController],
  providers: [InboxService, MessagesService, MembershipService, PinService],
  exports: [MembershipService, MessagesService],
})
export class ChatsModule {}
