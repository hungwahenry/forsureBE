import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../common/decorators/skip-onboarding.decorator';
import { AuthService } from '../auth/auth.service';
import { CheckUsernameDto } from './dto/check-username.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { OnboardingService } from './onboarding.service';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

@ApiTags('onboarding')
@ApiBearerAuth()
@SkipOnboarding()
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly auth: AuthService,
  ) {}

  @Get('username-available')
  @ApiOperation({ summary: 'Check whether a username is available' })
  async checkUsername(@Query() dto: CheckUsernameDto) {
    return {
      available: await this.onboarding.isUsernameAvailable(dto.username),
    };
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Upload onboarding avatar (JPEG/PNG/WEBP, max 10MB). Returns storage key + public URL.',
  })
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.onboarding.uploadAvatar(user.id, file);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit profile data, mark onboarding complete, and return a fresh access token',
  })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const result = await this.onboarding.complete(user.id, dto);
    const fresh = await this.auth.issueAccessToken(user.id, {
      onboarded: true,
    });
    return { ...result, ...fresh };
  }
}
