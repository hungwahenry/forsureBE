import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { MAX_BUSINESS_IMAGE_BYTES } from '../../../common/utils/business-images';
import { CreateBusinessDto } from './dto/create-business.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Business / Onboarding')
@ApiBearerAuth()
@Controller('business/onboarding')
@SkipOnboarding()
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_BUSINESS_IMAGE_BYTES } }),
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
      'Upload a business logo before the business exists (JPEG/PNG/WEBP, max 10MB). Returns storage key + URL — pass the key to POST /business/onboarding.',
  })
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.service.uploadLogoForUser(user.id, file);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create the business profile + OWNER membership for the authenticated user.',
  })
  createBusiness(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.service.createBusiness(user.id, dto);
  }
}
