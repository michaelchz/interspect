import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';

/**
 * 设置静态文件服务和路由重定向
 */
export const setupStaticAssets = (app: INestApplication): void => {
  // 注册静态文件服务
  app.use(
    '/interspect/web',
    express.static(join(__dirname, '..', '..', '..', 'public')),
  );

  // 添加 /interspect 重定向到 /interspect/web/
  app.use('/interspect', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/') {
      // 如果访问的是 /interspect，重定向到 /interspect/web/
      return res.redirect(301, '/interspect/web/');
    }
    next();
  });
};