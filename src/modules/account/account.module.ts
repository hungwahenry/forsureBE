import { Module } from '@nestjs/common';
import { StepUpModule } from '../step-up/step-up.module';
import { DeleteAccountController } from './delete/delete.controller';
import { DeleteAccountService } from './delete/delete.service';
import { EmailChangeController } from './email/email.controller';
import { EmailChangeService } from './email/email.service';
import { DataExportModule } from './export/export.module';
import { ProfileEditController } from './profile/profile.controller';
import { ProfileEditService } from './profile/profile.service';

@Module({
  imports: [StepUpModule, DataExportModule],
  controllers: [
    DeleteAccountController,
    ProfileEditController,
    EmailChangeController,
  ],
  providers: [DeleteAccountService, ProfileEditService, EmailChangeService],
})
export class AccountModule {}
