import { Module } from '@nestjs/common';
import { AdminMeModule } from './me/me.module';

@Module({
  imports: [AdminMeModule],
})
export class AdminModule {}
