import { Module } from '@nestjs/common';
import { InboxController } from './inbox/inbox.controller';
import { InboxService } from './inbox/inbox.service';
import { MembershipService } from './membership/membership.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';

@Module({
  controllers: [InboxController, MessagesController],
  providers: [InboxService, MessagesService, MembershipService],
  exports: [MembershipService],
})
export class ChatsModule {}
