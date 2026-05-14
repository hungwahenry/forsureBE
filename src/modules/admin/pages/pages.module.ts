import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminPagesController } from './pages.controller';
import { AdminPagesService } from './pages.service';
import { PublicPagesController } from './public-pages.controller';
import { PublicPagesService } from './public-pages.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [AdminPagesController, PublicPagesController],
  providers: [AdminPagesService, PublicPagesService],
})
export class AdminPagesModule {}
