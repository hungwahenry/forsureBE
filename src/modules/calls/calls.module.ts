import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { HmsService } from './hms.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [CallsController],
  providers: [CallsService, HmsService],
  exports: [HmsService],
})
export class CallsModule {}
