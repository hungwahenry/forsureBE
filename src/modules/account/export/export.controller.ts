import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { DataExportService } from './export.service';

@ApiTags('Account')
@Controller('account/export')
export class DataExportController {
  constructor(private readonly exports: DataExportService) {}

  @Post('request')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      "Request a JSON export of the caller's data. Builds asynchronously; an email arrives with a one-time download link when ready.",
  })
  request(@CurrentUser() user: AuthenticatedUser) {
    return this.exports.request(user.id);
  }

  @Get('download/:token')
  @Public()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Single-use download for a data export. Token is the auth — no bearer required.',
  })
  async download(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.exports.download(token);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.body);
  }
}
