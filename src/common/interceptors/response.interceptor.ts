import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { SKIP_RESPONSE_ENVELOPE } from '../decorators/skip-response-envelope.decorator';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: { requestId: string };
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_ENVELOPE,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        meta: { requestId: req.requestId },
      })),
    );
  }
}
