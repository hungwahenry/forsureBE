import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminUsersDetailController } from './detail/detail.controller';
import { AdminUsersDetailService } from './detail/detail.service';
import { AdminUsersListController } from './list/list.controller';
import { AdminUsersListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminUsersListController, AdminUsersDetailController],
  providers: [AdminUsersListService, AdminUsersDetailService],
})
export class AdminUsersModule {}
