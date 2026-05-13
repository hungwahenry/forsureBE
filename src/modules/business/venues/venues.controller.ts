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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import {
  CurrentBusinessMember,
  type BusinessMemberContext,
} from '../shared/current-business-member.decorator';
import { BusinessMemberGuard } from '../shared/business-member.guard';
import { CreateVenueDto } from './dto/create-venue.dto';
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
  @ApiOperation({ summary: 'List venues for the caller\'s business.' })
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
      'Update a venue — keywords, budget, radius, paused state, or display name.',
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
}
