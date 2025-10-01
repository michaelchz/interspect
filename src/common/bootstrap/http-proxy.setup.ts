import { INestApplication } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 设置 HTTP 代理处理中间件
 */
export const setupHttpProxy = (app: INestApplication): void => {
  console.log('>>> Setting up raw proxy handler...');

  app.use(
    (
      req: Request & { rawBodyNeeded?: boolean },
      res: Response,
      next: NextFunction,
    ) => {
      if (req.path.startsWith('/api/')) {
        console.log(
          '>>> Intercepting API request for proxy:',
          req.method,
          req.path,
        );
        // 这里我们仍然需要让代理处理，但是标记这是一个需要原始流的请求
        req.rawBodyNeeded = true;
      }
      next();
    },
  );
};