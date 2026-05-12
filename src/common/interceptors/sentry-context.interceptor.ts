import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class SentryContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.id) {
      Sentry.setUser({ id: user.id });
    }
    const activityId =
      (req.params as Record<string, string | undefined>)?.activityId ??
      (req.params as Record<string, string | undefined>)?.id;
    if (activityId && /^act_/.test(activityId)) {
      Sentry.setTag('activityId', activityId);
    }
    return next.handle();
  }
}
