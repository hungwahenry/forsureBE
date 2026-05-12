import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminMeController } from './me.controller';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminMeController],
})
export class AdminMeModule {}
