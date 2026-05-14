import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ReorderVenuePhotosDto } from './dto/reorder-photos.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenuesService } from './venues.service';

@ApiTags('Business / Venues')
@ApiBearerAuth()
@Controller('business/venues')
@UseGuards(BusinessMemberGuard)
@SkipOnboarding()
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Get()
  @ApiOperation({ summary: "List venues for the caller's business." })
  list(@CurrentBusinessMember() member: BusinessMemberContext) {
    return this.service.list(member.businessId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new venue.' })
  create(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Body() dto: CreateVenueDto,
  ) {
    return this.service.create(member.businessId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single venue.' })
  get(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
  ) {
    return this.service.get(member.businessId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a venue — keywords, budget, radius, paused, display name, phone, website.',
  })
  update(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.service.update(member.businessId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a venue.' })
  async remove(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.remove(member.businessId, id);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.CREATED)
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
      'Add a photo to a venue gallery (JPEG/PNG/WEBP, max 10MB, cap 10/venue).',
  })
  async addPhoto(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.service.addPhoto(member.businessId, id, file);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove one photo from the venue gallery.' })
  async removePhoto(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    await this.service.removePhoto(member.businessId, id, photoId);
  }

  @Patch(':id/photos/order')
  @ApiOperation({
    summary:
      'Reorder the venue gallery. Body must contain every photo id exactly once.',
  })
  reorderPhotos(
    @CurrentBusinessMember() member: BusinessMemberContext,
    @Param('id') id: string,
    @Body() dto: ReorderVenuePhotosDto,
  ) {
    return this.service.reorderPhotos(member.businessId, id, dto.photoIds);
  }
}
