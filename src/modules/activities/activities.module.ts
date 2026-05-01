import { Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { CreateActivityController } from './create/create.controller';
import { CreateActivityService } from './create/create.service';
import { JoinActivityController } from './join/join.controller';
import { JoinActivityService } from './join/join.service';

@Module({
  imports: [ChatsModule],
  controllers: [CreateActivityController, JoinActivityController],
  providers: [CreateActivityService, JoinActivityService],
  exports: [CreateActivityService, JoinActivityService],
})
export class ActivitiesModule {}
