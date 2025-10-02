import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket as WSWebSocket, Server as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { InspectService } from '../../inspect-module/services/inspect.service';
import { ProxyMetricsService } from '../../inspect-module/services/proxy-metrics.service';
import * as http from 'http';

@Injectable()
export class WebSocketGateway implements OnModuleDestroy {
  private server: WSServer | null = null;
  private readonly logger = new Logger(WebSocketGateway.name);
  private readonly activeClients = new Set<WSWebSocket>();
  private readonly activeServers = new Set<WSWebSocket>();
  private isClosing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly inspectService: InspectService,
    private readonly metricsService: ProxyMetricsService
  ) {}

  /**
   * 初始化 WebSocket 服务器
   */
  initialize(server: http.Server) {
    this.server = new WSServer({ server });

    this.server.on('connection', (client: WSWebSocket, request: IncomingMessage) => {
      this.handleConnection(client, request);
    });

    this.server.on('error', (error) => {
      this.logger.error('WebSocket 服务器错误:', error);
    });
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(client: WSWebSocket, request: IncomingMessage) {
    // 获取客户端请求的路径
    const targetUrl = this.buildTargetUrl(request.url || '/');
    this.logger.log(`新的连接: ${request.socket.remoteAddress} → ${targetUrl}`);

    try {
      const serverSocket = new WSWebSocket(targetUrl);

      this.trackConnection(client, serverSocket);

      // 代理消息：客户端 <-> 服务端
      this.proxyMessages(client, serverSocket, 'client-to-server');
      this.proxyMessages(serverSocket, client, 'server-to-client');

      // 处理关闭与错误
      this.setupCloseHandler(client, serverSocket, 'client');
      this.setupCloseHandler(serverSocket, client, 'server');
      this.setupErrorHandler(client, 'client');
      this.setupErrorHandler(serverSocket, 'server');
    } catch (err) {
      this.logger.error('连接目标服务器失败:', err);
      client.close();
    }
  }

  /** 构建目标服务器 WebSocket 地址 */
  private buildTargetUrl(requestPath: string): string {
    const baseUrl = this.configService.get<string>('TARGET_SERVER_URL');
    if (!baseUrl) throw new Error('缺少配置: TARGET_SERVER_URL');
    return new URL(requestPath, baseUrl.replace(/^http/, 'ws')).href;
  }

  /** 跟踪新连接并更新指标 */
  private trackConnection(client: WSWebSocket, serverSocket: WSWebSocket) {
    this.activeClients.add(client);
    this.activeServers.add(serverSocket);
    this.metricsService.incrementClientConnections();
    this.metricsService.incrementServerConnections();
  }

  /** 代理消息流转 */
  private proxyMessages(
    source: WSWebSocket,
    target: WSWebSocket,
    direction: 'client-to-server' | 'server-to-client'
  ) {
    source.on('message', (data, isBinary) => {
      if (target.readyState !== WSWebSocket.OPEN) return;

      const start = Date.now();
      // 使用 InspectService 记录
      this.inspectService.logWebSocketMessage({
        direction,
        body: data,
        isBinary,
        timestamp: new Date().toISOString(),
      });

      if (!isBinary && data instanceof Buffer) {
        target.send(data.toString('utf8'));
      } else {
        target.send(data, { binary: isBinary });
      }

      this.updateMetrics(direction);
      this.metricsService.addMessageProcessingTime(Date.now() - start);
    });
  }

  /** 更新消息指标 */
  private updateMetrics(direction: 'client-to-server' | 'server-to-client') {
    if (direction === 'client-to-server') {
      this.metricsService.incrementClientMessagesSent();
      this.metricsService.incrementServerMessagesReceived();
    } else {
      this.metricsService.incrementServerMessagesSent();
      this.metricsService.incrementClientMessagesReceived();
    }
  }

  /** 处理连接关闭 */
  private setupCloseHandler(source: WSWebSocket, target: WSWebSocket, type: 'client' | 'server') {
    source.on('close', () => {
      if (type === 'client') {
        this.activeClients.delete(source);
        this.metricsService.decrementClientConnections();
      } else {
        this.activeServers.delete(source);
        this.metricsService.decrementServerConnections();
      }

      if (target.readyState === WSWebSocket.OPEN) {
        target.close();
      }
    });
  }

  /** 处理错误 */
  private setupErrorHandler(socket: WSWebSocket, type: 'client' | 'server') {
    socket.on('error', (err) => {
      this.logger.error(`${type} 连接错误:`, err);

      if (type === 'client') {
        this.activeClients.delete(socket);
        this.metricsService.decrementClientConnections();
        this.metricsService.incrementClientConnectionError();
      } else {
        this.activeServers.delete(socket);
        this.metricsService.decrementServerConnections();
        this.metricsService.incrementServerConnectionError();
      }

      socket.close();
    });
  }

  /**
   * 关闭WebSocket服务器和所有连接
   */
  close() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.logger.log('正在关闭 WebSocket 服务器...');

    this.shutdownConnections(this.activeClients, 'client');
    this.shutdownConnections(this.activeServers, 'server');

    if (this.server) {
      this.server.close((err) => {
        if (err) this.logger.error('关闭 WebSocket 服务器失败:', err);
        else this.logger.log('WebSocket 服务器已关闭');
      });
      this.server = null;
    }
  }

  /** 关闭所有连接并更新指标 */
  private shutdownConnections(conns: Set<WSWebSocket>, type: 'client' | 'server') {
    for (const socket of conns) {
      try {
        if (socket.readyState === WSWebSocket.OPEN) socket.close(1001, 'Server Shutdown');
      } catch (err) {
        this.logger.error(`关闭 ${type} 连接失败:`, err);
      }
    }
    conns.clear();
    if (type === 'client') {
      this.metricsService['currentClientConnections'] = 0;
    } else {
      this.metricsService['currentServerConnections'] = 0;
    }
  }

  onModuleDestroy() {
    this.close();
  }
}
