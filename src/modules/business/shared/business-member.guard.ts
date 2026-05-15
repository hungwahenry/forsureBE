import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { BusinessMemberRole } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';

declare module 'express-serve-static-core' {
  interface Request {
    businessMember?: {
      businessId: string;
      role: BusinessMemberRole;
    };
  }
}

@Injectable()
export class BusinessMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new AppException(ErrorCode.AUTH_UNAUTHORIZED);
    }

    // Until Team-invite ships, the 1-user-1-business invariant holds; the
    // orderBy keeps the choice deterministic when multi-membership lands.
    const membership = await this.prisma.businessMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        businessId: true,
        role: true,
        business: { select: { suspendedAt: true } },
      },
    });
    if (!membership) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'You are not a member of any business.',
      });
    }
    if (membership.business.suspendedAt) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, {
        message: 'This business has been suspended.',
      });
    }

    req.businessMember = {
      businessId: membership.businessId,
      role: membership.role,
    };
    return true;
  }
}
