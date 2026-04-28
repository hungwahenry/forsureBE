import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCode } from '../../../common/constants/error-codes';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AppException } from '../../../common/exceptions/app.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<T>(err: Error | null, user: T, info: { name?: string } | null): T {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new AppException(ErrorCode.AUTH_TOKEN_EXPIRED);
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
      }
      throw new AppException(ErrorCode.AUTH_UNAUTHORIZED);
    }
    return user;
  }
}
