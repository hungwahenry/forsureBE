import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../../shared/admin-shared.module';
import { AdminCronDetailController } from './detail/detail.controller';
import { AdminCronDetailService } from './detail/detail.service';
import { AdminCronListController } from './list/list.controller';
import { AdminCronListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminCronListController, AdminCronDetailController],
  providers: [AdminCronListService, AdminCronDetailService],
})
export class AdminCronModule {}
