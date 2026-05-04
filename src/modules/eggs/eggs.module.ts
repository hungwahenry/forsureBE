import { Module } from '@nestjs/common';
import { CreditsController } from './credits/credits.controller';
import { CreditsService } from './credits/credits.service';
import { EggsService } from './eggs.service';

@Module({
  controllers: [CreditsController],
  providers: [EggsService, CreditsService],
})
export class EggsModule {}
