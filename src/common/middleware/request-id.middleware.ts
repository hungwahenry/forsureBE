import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

const HEADER = 'x-request-id';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(HEADER);
    const id = incoming && incoming.length <= 128 ? incoming : `req_${uuidv7().replace(/-/g, '')}`;
    req.requestId = id;
    res.setHeader(HEADER, id);
    next();
  }
}
