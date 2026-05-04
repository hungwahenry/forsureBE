import { Module } from '@nestjs/common';
import { StepUpModule } from '../step-up/step-up.module';
import { DeleteAccountController } from './delete/delete.controller';
import { DeleteAccountService } from './delete/delete.service';
import { ProfileEditController } from './profile/profile.controller';
import { ProfileEditService } from './profile/profile.service';

@Module({
  imports: [StepUpModule],
  controllers: [DeleteAccountController, ProfileEditController],
  providers: [DeleteAccountService, ProfileEditService],
})
export class AccountModule {}
