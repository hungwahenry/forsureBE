import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { AdminGuard } from '../shared/admin.guard';
import { AdminBusinessCategoriesService } from './business-categories.service';
import { CreateBusinessCategoryDto } from './dto/create-category.dto';
import { UpdateBusinessCategoryDto } from './dto/update-category.dto';

@ApiTags('Admin / Business Categories')
@ApiBearerAuth()
@Controller('admin/business-categories')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminBusinessCategoriesController {
  constructor(private readonly service: AdminBusinessCategoriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all business categories (active + inactive), with usage counts.',
  })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new business category.' })
  create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateBusinessCategoryDto,
    @Req() req: Request,
  ) {
    return this.service.create(dto, { adminId: admin.id, request: req });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a business category.' })
  update(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateBusinessCategoryDto,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, { adminId: admin.id, request: req });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a category. 409 if any business references it (deactivate instead).',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.remove(id, { adminId: admin.id, request: req });
  }
}
