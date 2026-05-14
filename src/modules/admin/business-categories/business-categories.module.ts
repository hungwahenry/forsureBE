import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminBusinessCategoriesController } from './business-categories.controller';
import { AdminBusinessCategoriesService } from './business-categories.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminBusinessCategoriesController],
  providers: [AdminBusinessCategoriesService],
})
export class AdminBusinessCategoriesModule {}
