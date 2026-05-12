import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminMessagesController } from './messages.controller';
import { AdminMessagesService } from './messages.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminMessagesController],
  providers: [AdminMessagesService],
})
export class AdminMessagesModule {}
