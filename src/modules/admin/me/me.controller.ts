import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { SkipOnboarding } from '../../../common/decorators/skip-onboarding.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminGuard } from '../shared/admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/me')
@UseGuards(AdminGuard)
@SkipOnboarding()
export class AdminMeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated admin user' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        profile: {
          select: {
            displayName: true,
            username: true,
            avatarKey: true,
          },
        },
      },
    });
  }
}
