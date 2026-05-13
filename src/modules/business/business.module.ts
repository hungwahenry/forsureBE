import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';

@Module({
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
