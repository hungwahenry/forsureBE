import { Module } from '@nestjs/common';
import { AdminMeModule } from './me/me.module';
import { AdminUsersModule } from './users/users.module';

@Module({
  imports: [AdminMeModule, AdminUsersModule],
})
export class AdminModule {}
