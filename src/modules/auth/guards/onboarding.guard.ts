import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { SKIP_ONBOARDING_KEY } from '../../../common/decorators/skip-onboarding.decorator';
import { AppException } from '../../../common/exceptions/app.exception';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_ONBOARDING_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) return true; // JwtAuthGuard runs first; if user is missing here, the route is misconfigured

    if (!user.onboarded) {
      throw new AppException(ErrorCode.ONBOARDING_REQUIRED);
    }
    return true;
  }
}
