import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
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
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { MAX_BUSINESS_IMAGE_BYTES } from '../../../common/utils/business-images';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessMeService } from './me.service';

@ApiTags('Business / Me')
@ApiBearerAuth()
@Controller('business/me')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class BusinessMeController {
  constructor(private readonly service: BusinessMeService) {}

  @Get()
  @ApiOperation({
    summary: "Full profile of the caller's business, with category included.",
  })
  get(@CurrentBusinessMember() member: BusinessMemberContext) {
    return this.service.get(member.businessId);
  }

  @Patch()
  @ApiOperation({
    summary:
      'Update any subset of {name, category, logo, cover photo, short description, support contact}.',
  })
  update(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(member.businessId, dto);
  }

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
      'Upload a new logo (JPEG/PNG/WEBP, max 10MB). Returns the storage key — call PATCH /business/me with `logoKey` to apply.',
  })
  async uploadLogo(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.service.uploadLogo(member.businessId, file);
  }

  @Post('cover-photo')
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
      'Upload a new cover photo (JPEG/PNG/WEBP, max 10MB). Returns the storage key — call PATCH /business/me with `coverPhotoKey` to apply.',
  })
  async uploadCoverPhoto(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.service.uploadCoverPhoto(member.businessId, file);
  }
}
