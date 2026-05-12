import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminPostsController } from './posts.controller';
import { AdminPostsService } from './posts.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminPostsController],
  providers: [AdminPostsService],
})
export class AdminPostsModule {}
