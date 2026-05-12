import { Global, Module } from '@nestjs/common';
import { CronRunLogger } from './cron-run-logger.service';

@Global()
@Module({
  providers: [CronRunLogger],
  exports: [CronRunLogger],
})
export class CronModule {}
