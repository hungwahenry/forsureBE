import { Module } from '@nestjs/common';
import { PublicBusinessCategoriesController } from './business-categories.controller';
import { PublicBusinessCategoriesService } from './business-categories.service';

@Module({
  controllers: [PublicBusinessCategoriesController],
  providers: [PublicBusinessCategoriesService],
})
export class PublicBusinessCategoriesModule {}
