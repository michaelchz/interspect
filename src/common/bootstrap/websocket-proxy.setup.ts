import { INestApplication } from '@nestjs/common';
import * as http from 'http';
import { WebSocketGateway } from '../../websocket-module/services/websocket.gateway';

/**
 * 初始化 WebSocket 代理服务
 */
export const setupWebSocketProxy = (app: INestApplication): void => {
  const server = app.getHttpServer() as unknown as http.Server;
  const webSocketGateway = app.get<WebSocketGateway>(WebSocketGateway);
  webSocketGateway.initialize(server);
};