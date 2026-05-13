import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SkipOnboarding } from '../../common/decorators/skip-onboarding.decorator';
import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a one-time login/signup code to the email' })
  async requestCode(
    @Body() dto: RequestCodeDto,
    @Req() req: Request,
  ): Promise<{ sent: true }> {
    await this.auth.requestCode(dto.email, req.ip);
    return { sent: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the OTP and issue access + refresh tokens' })
  async verifyCode(@Body() dto: VerifyCodeDto, @Req() req: Request) {
    return this.auth.verifyCode(dto.email, dto.code, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token, issue a new pair' })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @SkipOnboarding()
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Return the authenticated user and onboarding state',
  })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }
}
