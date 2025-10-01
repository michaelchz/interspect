import { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpProxy } from '../../proxy-module/services/http.proxy';

/**
 * 设置 HTTP 代理处理中间件
 * 代理除了 /interspect 路径之外的所有路径
 */
export const setupHttpProxy = (app: INestApplication): void => {
  const httpProxy = app.get<HttpProxy>(HttpProxy);

  // 处理所有请求，排除 /interspect 路径
  app.use((req: Request, res: Response, next: Function) => {
    if (req.path.startsWith('/interspect')) {
      // 跳过 /interspect 路径，让其他中间件处理
      next();
    } else {
      // 代理所有其他路径
      httpProxy.forwardRequest(req, res);
    }
  });
};