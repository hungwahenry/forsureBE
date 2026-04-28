import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateRenderer } from './template.renderer';

@Global()
@Module({
  providers: [EmailService, TemplateRenderer],
  exports: [EmailService],
})
export class EmailModule {}
