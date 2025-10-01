import { INestApplication } from '@nestjs/common';
import { setupFilters } from './filters.setup';
import { setupStaticAssets } from './static-assets.setup';
import { setupHttpProxy } from './http-proxy.setup';
import { setupWebSocketProxy } from './websocket-proxy.setup';

/**
 * 应用程序配置设置入口
 * 按顺序设置：过滤器 -> 静态资源 -> HTTP 代理 -> WebSocket 代理
 */
export const setupApplication = (app: INestApplication): void => {
  setupFilters(app);
  setupStaticAssets(app);
  setupHttpProxy(app);
  setupWebSocketProxy(app);
};