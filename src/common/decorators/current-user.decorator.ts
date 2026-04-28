import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  onboarded: boolean;
}

/** Resolves the currently authenticated user from the JWT-attached request.user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as AuthenticatedUser;
  },
);
