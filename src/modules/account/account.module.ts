import { Module } from '@nestjs/common';
import { StepUpModule } from '../step-up/step-up.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [StepUpModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
