import { Module } from '@nestjs/common';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { AdminBusinessesActionsController } from './actions/actions.controller';
import { AdminBusinessesActionsService } from './actions/actions.service';
import { AdminBusinessBoostsController } from './boosts/boosts.controller';
import { AdminBusinessBoostsService } from './boosts/boosts.service';
import { AdminBusinessesDetailController } from './detail/detail.controller';
import { AdminBusinessesDetailService } from './detail/detail.service';
import { AdminBusinessesListController } from './list/list.controller';
import { AdminBusinessesListService } from './list/list.service';
import { AdminBusinessMembersController } from './members/members.controller';
import { AdminBusinessMembersService } from './members/members.service';
import { AdminBusinessesStatsController } from './stats/stats.controller';
import { AdminBusinessesStatsService } from './stats/stats.service';
import { AdminBusinessVenuesController } from './venues/venues.controller';
import { AdminBusinessVenuesService } from './venues/venues.service';

@Module({
  imports: [AdminSharedModule],
  controllers: [
    AdminBusinessesStatsController,
    AdminBusinessesListController,
    AdminBusinessesDetailController,
    AdminBusinessesActionsController,
    AdminBusinessVenuesController,
    AdminBusinessBoostsController,
    AdminBusinessMembersController,
  ],
  providers: [
    AdminBusinessesStatsService,
    AdminBusinessesListService,
    AdminBusinessesDetailService,
    AdminBusinessesActionsService,
    AdminBusinessVenuesService,
    AdminBusinessBoostsService,
    AdminBusinessMembersService,
  ],
})
export class AdminBusinessesModule {}
