import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminAuditLogDetailController } from './detail/detail.controller';
import { AdminAuditLogDetailService } from './detail/detail.service';
import { AdminAuditLogListController } from './list/list.controller';
import { AdminAuditLogListService } from './list/list.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminAuditLogListController, AdminAuditLogDetailController],
  providers: [AdminAuditLogListService, AdminAuditLogDetailService],
})
export class AdminAuditLogModule {}
