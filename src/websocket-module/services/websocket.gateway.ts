import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { WebSocket as WSWebSocket } from "ws";
import { Server as WSServer } from "ws";
import { AppConfigService } from "../../app-config-module/services/app-config.service";
import { IncomingMessage } from "http";
import { InspectService } from "../../inspect-module/services/inspect.service";
import * as http from "http";

@Injectable()
export class WebSocketGateway implements OnModuleDestroy {
  private server: WSServer | null = null;
  private readonly logger = new Logger(WebSocketGateway.name);
  private activeConnections: Set<WSWebSocket> = new Set();
  private activeServerSockets: Set<WSWebSocket> = new Set();
  private isClosing = false;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly inspectService: InspectService,
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

    const targetUrl = this.appConfigService.targetServerUrl.replace(
      /^http/,
      "ws",
    );
    this.logger.log(`连接到目标服务器: ${targetUrl}`);

    try {
      // 创建服务器连接
      const serverSocket = new WSWebSocket(targetUrl);

      // 跟踪连接
      this.activeConnections.add(client);
      this.activeServerSockets.add(serverSocket);

      // 代理：客户端 → 服务器
      client.on("message", (data, isBinary) => {
        if (serverSocket.readyState === WSWebSocket.OPEN) {
          // 使用 InspectService 记录
          const messageData = isBinary
            ? "[binary data]"
            : typeof data === "string"
              ? data
              : data instanceof Buffer
                ? data.toString("utf8")
                : data instanceof ArrayBuffer
                  ? Buffer.from(data).toString("utf8")
                  : "[unknown data type]";

          this.inspectService.logWebSocketMessage({
            direction: "client-to-server",
            data: messageData,
            isBinary,
            serverIndex: 0, // WebSocket 目前只连接第一个服务器
            serviceName: "WebSocketGateway",
            timestamp: new Date().toISOString(),
          });

          // 根据原始消息类型发送
          if (!isBinary && data instanceof Buffer) {
            // 原始是文本帧，但 ws 给了 Buffer，需要转回字符串
            serverSocket.send(data.toString("utf8"));
          } else {
            // 保持二进制数据
            serverSocket.send(data, { binary: isBinary });
          }
        }
      });

      // 代理：服务器 → 客户端
      serverSocket.on("message", (data, isBinary) => {
        if (client.readyState === WSWebSocket.OPEN) {
          // 使用 InspectService 记录
          const messageData = isBinary
            ? "[binary data]"
            : typeof data === "string"
              ? data
              : data instanceof Buffer
                ? data.toString("utf8")
                : data instanceof ArrayBuffer
                  ? Buffer.from(data).toString("utf8")
                  : "[unknown data type]";

          this.inspectService.logWebSocketMessage({
            direction: "server-to-client",
            data: messageData,
            isBinary,
            serverIndex: 0, // WebSocket 目前只连接第一个服务器
            serviceName: "WebSocketGateway",
            timestamp: new Date().toISOString(),
          });

          // 根据原始消息类型发送
          if (!isBinary && data instanceof Buffer) {
            // 原始是文本帧，但 ws 给了 Buffer，需要转回字符串
            client.send(data.toString("utf8"));
          } else {
            // 保持二进制数据
            client.send(data, { binary: isBinary });
          }
        }
      });

      // 处理连接关闭
      client.on("close", () => {
        this.activeConnections.delete(client);
        if (serverSocket.readyState === WSWebSocket.OPEN) {
          serverSocket.close();
        }
      });

      serverSocket.on("close", () => {
        this.activeServerSockets.delete(serverSocket);
        if (client.readyState === WSWebSocket.OPEN) {
          client.close();
        }
      });

      // 处理错误
      client.on("error", (error) => {
        this.logger.error("客户端错误:", error);
        this.activeConnections.delete(client);
        client.close();
      });

      serverSocket.on("error", (error) => {
        this.logger.error("服务器错误:", error);
        this.activeServerSockets.delete(serverSocket);
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
