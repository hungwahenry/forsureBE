import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';

declare module 'express-serve-static-core' {
  interface Request {
    adminRole?: 'ADMIN' | 'SUPER_ADMIN';
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new AppException(ErrorCode.AUTH_UNAUTHORIZED);
    }

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, status: true },
    });

    if (!record || record.status === 'DELETED') {
      throw new AppException(ErrorCode.AUTH_UNAUTHORIZED);
    }
    if (record.status === 'SUSPENDED') {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN);
    }
    if (record.role !== 'ADMIN' && record.role !== 'SUPER_ADMIN') {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN);
    }

    req.adminRole = record.role;
    return true;
  }
}
