import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminActivitiesController } from './activities.controller';
import { AdminActivitiesService } from './activities.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminActivitiesController],
  providers: [AdminActivitiesService],
})
export class AdminActivitiesModule {}
