import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { BusinessMemberRole } from '@prisma/client';
import type { Request } from 'express';

export interface BusinessMemberContext {
  businessId: string;
  role: BusinessMemberRole;
}

export const CurrentBusinessMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BusinessMemberContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.businessMember) {
      throw new Error(
        'CurrentBusinessMember used without BusinessMemberGuard',
      );
    }
    return req.businessMember;
  },
);
