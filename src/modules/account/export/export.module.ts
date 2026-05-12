import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExportBuilder } from './export.builder';
import { DataExportController } from './export.controller';
import { DataExportService } from './export.service';
import { DATA_EXPORT_QUEUE, DataExportQueue } from './queue/export.queue';
import { DataExportProcessor } from './queue/export.processor';

@Module({
  imports: [BullModule.registerQueue({ name: DATA_EXPORT_QUEUE })],
  controllers: [DataExportController],
  providers: [
    DataExportService,
    DataExportQueue,
    DataExportProcessor,
    ExportBuilder,
  ],
  exports: [DataExportService],
})
export class DataExportModule {}
