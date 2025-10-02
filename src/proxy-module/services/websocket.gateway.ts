import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebSocket as WSWebSocket } from "ws";
import { Server as WSServer } from "ws";
import { IncomingMessage } from "http";
import { InspectService } from "../../inspect-module/services/inspect.service";
import { ProxyMetricsService } from "../../inspect-module/services/proxy-metrics.service";
import * as http from "http";

@Injectable()
export class WebSocketGateway implements OnModuleDestroy {
  private server: WSServer | null = null;
  private readonly logger = new Logger(WebSocketGateway.name);
  private activeConnections: Set<WSWebSocket> = new Set();
  private activeServerSockets: Set<WSWebSocket> = new Set();
  private isClosing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly inspectService: InspectService,
    private readonly metricsService: ProxyMetricsService,
  ) {}

  /**
   * 初始化 WebSocket 服务器
   */
  initialize(server: http.Server) {
    this.server = new WSServer({ server });

    this.server.on(
      "connection",
      (client: WSWebSocket, request: IncomingMessage) => {
        this.handleConnection(client, request);
      },
    );

    this.server.on("error", (error) => {
      this.logger.error("WebSocket 服务器错误:", error);
    });
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(client: WSWebSocket, request: IncomingMessage) {
    this.logger.log(`新的 WebSocket 连接: ${request.socket.remoteAddress}`);

    // 获取客户端请求的路径
    const requestPath = request.url || "/";
    this.logger.log(`客户端请求路径: ${requestPath}`);

    // 构建完整的 WebSocket URL，包含原始请求路径
    const targetServerUrl = this.configService.get<string>('TARGET_SERVER_URL');
    if (!targetServerUrl) {
      throw new Error('TARGET_SERVER_URL 环境变量未配置');
    }
    const targetUrl = new URL(
      requestPath,
      targetServerUrl.replace(/^http/, "ws"),
    ).href;

    this.logger.log(`连接到目标服务器: ${targetUrl}`);

    try {
      // 创建服务器连接
      const serverSocket = new WSWebSocket(targetUrl);

      // 跟踪连接
      this.activeConnections.add(client);
      this.activeServerSockets.add(serverSocket);

      // 记录连接统计
      this.metricsService.incrementClientConnections();
      this.metricsService.incrementServerConnections();

      // 代理：客户端 → 服务器
      client.on("message", (data, isBinary) => {
        if (serverSocket.readyState === WSWebSocket.OPEN) {
          const startTime = Date.now();

          // 使用 InspectService 记录
          this.inspectService.logWebSocketMessage({
            direction: "client-to-server",
            body: data,
            isBinary,
            timestamp: new Date().toISOString(),
          });

          // 记录消息统计
          this.metricsService.incrementClientMessagesSent();
          this.metricsService.incrementServerMessagesReceived();

          // 根据原始消息类型发送
          if (!isBinary && data instanceof Buffer) {
            // 原始是文本帧，但 ws 给了 Buffer，需要转回字符串
            serverSocket.send(data.toString("utf8"));
          } else {
            // 保持二进制数据
            serverSocket.send(data, { binary: isBinary });
          }

          // 记录处理时间
          const processingTime = Date.now() - startTime;
          this.metricsService.addMessageProcessingTime(processingTime);
        }
      });

      // 代理：服务器 → 客户端
      serverSocket.on("message", (data, isBinary) => {
        if (client.readyState === WSWebSocket.OPEN) {
          const startTime = Date.now();

          // 使用 InspectService 记录
          this.inspectService.logWebSocketMessage({
            direction: "server-to-client",
            body: data,
            isBinary,
            timestamp: new Date().toISOString(),
          });

          // 记录消息统计
          this.metricsService.incrementServerMessagesSent();
          this.metricsService.incrementClientMessagesReceived();

          // 根据原始消息类型发送
          if (!isBinary && data instanceof Buffer) {
            // 原始是文本帧，但 ws 给了 Buffer，需要转回字符串
            client.send(data.toString("utf8"));
          } else {
            // 保持二进制数据
            client.send(data, { binary: isBinary });
          }

          // 记录处理时间
          const processingTime = Date.now() - startTime;
          this.metricsService.addMessageProcessingTime(processingTime);
        }
      });

      // 处理连接关闭
      client.on("close", () => {
        this.activeConnections.delete(client);
        this.metricsService.decrementClientConnections();
        if (serverSocket.readyState === WSWebSocket.OPEN) {
          serverSocket.close();
        }
      });

      serverSocket.on("close", () => {
        this.activeServerSockets.delete(serverSocket);
        this.metricsService.decrementServerConnections();
        if (client.readyState === WSWebSocket.OPEN) {
          client.close();
        }
      });

      // 处理错误
      client.on("error", (error) => {
        this.logger.error("客户端错误:", error);
        this.activeConnections.delete(client);
        this.metricsService.decrementClientConnections();
        this.metricsService.incrementClientConnectionError();
        client.close();
      });

      serverSocket.on("error", (error) => {
        this.logger.error("服务器错误:", error);
        this.activeServerSockets.delete(serverSocket);
        this.metricsService.decrementServerConnections();
        this.metricsService.incrementServerConnectionError();
        serverSocket.close();
      });
    } catch (error) {
      this.logger.error("创建服务器连接失败:", error);
      client.close();
    }
  }

  /**
   * 关闭WebSocket服务器和所有连接
   */
  close() {
    // 防止重复关闭
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;

    this.logger.log("正在关闭WebSocket服务器...");

    // 关闭所有客户端连接
    for (const client of this.activeConnections) {
      try {
        if (client.readyState === WSWebSocket.OPEN) {
          client.close(1001, "Server Shutdown");
        }
      } catch (error) {
        this.logger.error("关闭客户端连接失败:", error);
      }
    }
    this.activeConnections.clear();
    this.metricsService["currentClientConnections"] = 0;

    // 关闭所有服务器连接
    for (const serverSocket of this.activeServerSockets) {
      try {
        if (serverSocket.readyState === WSWebSocket.OPEN) {
          serverSocket.close(1001, "Server Shutdown");
        }
      } catch (error) {
        this.logger.error("关闭服务器连接失败:", error);
      }
    }
    this.activeServerSockets.clear();
    this.metricsService["currentServerConnections"] = 0;

    // 关闭WebSocket服务器
    if (this.server) {
      try {
        this.server.close((error) => {
          if (error) {
            this.logger.error("关闭WebSocket服务器失败:", error);
          } else {
            this.logger.log("WebSocket服务器已关闭");
          }
        });
        this.server = null;
      } catch (error) {
        this.logger.error("关闭WebSocket服务器失败:", error);
      }
    }

    this.logger.log("WebSocket服务器关闭完成");
  }

  /**
   * 实现OnModuleDestroy接口
   */
  onModuleDestroy() {
    this.close();
  }
}
