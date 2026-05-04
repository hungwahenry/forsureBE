import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { MAX_AVATAR_BYTES } from '../../../common/utils/avatar';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileEditService } from './profile.service';

@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
export class ProfileEditController {
  constructor(private readonly profile: ProfileEditService) {}

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Partial update of the caller’s profile. Returns the resolved MyProfile.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profile.update(user.id, dto);
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
      "Replace the caller's avatar (JPEG/PNG/WEBP, max 10MB). Returns the resolved MyProfile.",
  })
  updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.profile.updateAvatar(user.id, file);
  }
}
