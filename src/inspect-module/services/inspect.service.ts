import { Injectable, Logger } from "@nestjs/common";
import { SseService } from "./sse.service";

// 日志数据接口
interface RequestLog {
  method: string | undefined;
  url: string | undefined;
  headers: any;
  body: string;
  serverIndex: number;
  serviceName: string;
  timestamp: string;
}

interface ResponseLog {
  method: string | undefined;
  url: string | undefined;
  statusCode: number;
  headers: any;
  body: string;
  serverIndex: number;
  serviceName: string;
  timestamp: string;
}

interface ErrorLog {
  error: string;
  stack?: string;
  serverIndex: number;
  serviceName: string;
  timestamp: string;
}

interface WebSocketLog {
  direction: "client-to-server" | "server-to-client";
  data: string;
  isBinary: boolean;
  serverIndex: number;
  serviceName: string;
  timestamp: string;
}

@Injectable()
export class InspectService {
  private readonly logger = new Logger(InspectService.name);

  constructor(private readonly sseService: SseService) {}

  /**
   * 记录请求日志
   */
  logRequest(log: RequestLog): void {
    // 控制台日志
    this.logger.log(
      `📥 ${log.serviceName}[${log.serverIndex}] Request: ${log.method} ${log.url}`,
    );
    this.logger.debug(`Request Headers: ${JSON.stringify(log.headers)}`);

    // 记录请求体内容（调试级别）
    if (log.body) {
      this.logger.debug(`Request Body: ${log.body}`);
    }

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "request",
        data: log,
        icon: "📥",
        message: `${log.serviceName}[${log.serverIndex}] Request: ${log.method} ${log.url}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录响应日志
   */
  logResponse(log: ResponseLog): void {
    const statusIcon =
      log.statusCode >= 400 ? "❌" : log.statusCode >= 300 ? "🔄" : "✅";

    // 控制台日志
    this.logger[log.statusCode >= 400 ? "warn" : "debug"](
      `${statusIcon} ${log.serviceName}[${log.serverIndex}] Response: ${log.method} ${log.url} -> ${log.statusCode}`,
    );

    // 记录响应体内容（调试级别）
    this.logger.debug(`服务器响应内容 (${log.statusCode}): ${log.body}`);

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "response",
        data: log,
        icon: statusIcon,
        message: `${log.serviceName}[${log.serverIndex}] Response: ${log.method} ${log.url} -> ${log.statusCode}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录错误日志
   */
  logError(log: ErrorLog): void {
    // 控制台日志
    this.logger.error(
      `Proxy error (server ${log.serverIndex}): ${log.error}`,
      log.stack,
    );

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "error",
        data: log,
        icon: "💥",
        message: `Proxy error (server ${log.serverIndex}): ${log.error}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录 WebSocket 消息日志
   */
  logWebSocketMessage(log: WebSocketLog): void {
    const direction = log.direction === "client-to-server" ? "→" : "←";
    const dataType = log.isBinary ? "BINARY" : "TEXT";

    // 控制台日志
    this.logger.debug(
      `🔌 ${log.serviceName}[${log.serverIndex}] WebSocket ${direction}: ${dataType} (${log.data.length} bytes)`,
    );

    // 记录消息内容（调试级别）
    if (!log.isBinary && log.data.length > 0) {
      this.logger.debug(`WebSocket ${direction} 内容: ${log.data}`);
    }

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "websocket",
        data: log,
        icon: "🔌",
        message: `${log.serviceName}[${log.serverIndex}] WebSocket ${direction}: ${dataType} (${log.data.length} bytes)`,
        timestamp: log.timestamp,
      });
    }
  }
}
