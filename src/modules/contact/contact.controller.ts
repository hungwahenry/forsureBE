import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ContactService } from './contact.service';
import { CreateContactLeadDto } from './dto/create-contact-lead.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Submit a contact/demo-request lead from the marketing site.',
  })
  async submit(
    @Body() dto: CreateContactLeadDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.contact.submit(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
