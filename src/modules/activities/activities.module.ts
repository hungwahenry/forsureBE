import { Module } from '@nestjs/common';
import { CreateActivityController } from './create/create.controller';
import { CreateActivityService } from './create/create.service';
import { JoinActivityController } from './join/join.controller';
import { JoinActivityService } from './join/join.service';

@Module({
  controllers: [CreateActivityController, JoinActivityController],
  providers: [CreateActivityService, JoinActivityService],
  exports: [CreateActivityService, JoinActivityService],
})
export class ActivitiesModule {}
