import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminReportReasonsController } from './report-reasons.controller';
import { AdminReportReasonsService } from './report-reasons.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminReportReasonsController],
  providers: [AdminReportReasonsService],
})
export class AdminReportReasonsModule {}
