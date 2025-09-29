import { Injectable, Logger } from "@nestjs/common";
import { SseService } from "./sse.service";
import * as zlib from "zlib";
import { IncomingHttpHeaders } from "http";

// 日志数据接口
interface RequestLog {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string | Buffer;
  serviceName: string;
  timestamp: string;
  entryType: 'request';
}

interface ResponseLog {
  method: string | undefined;
  url: string | undefined;
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string | Buffer;
  serviceName: string;
  timestamp: string;
  entryType: 'response';
}

interface ErrorLog {
  error: string;
  stack?: string;
  serviceName: string;
  timestamp: string;
  entryType: 'error';
}

interface WebSocketLog {
  direction: "client-to-server" | "server-to-client";
  body: string;
  isBinary: boolean;
  serviceName: string;
  timestamp: string;
  entryType: 'websocket';
}

@Injectable()
export class InspectService {
  private readonly logger = new Logger(InspectService.name);

  constructor(private readonly sseService: SseService) {}

  /**
   * 通用的 HTTP Body 处理方法
   */
  private processHttpBody(
    body: string | Buffer,
    headers: IncomingHttpHeaders,
  ): string {
    if (!body) return "";

    // 获取 Content-Type 和 Content-Encoding
    const contentType = (
      (headers["content-type"] as string) ||
      (headers["Content-Type"] as string) ||
      ""
    ).toLowerCase();
    const contentEncoding = (
      (headers["content-encoding"] as string) ||
      (headers["Content-Encoding"] as string) ||
      ""
    ).toLowerCase();

    // 如果是 Buffer，按标准流程处理
    if (Buffer.isBuffer(body)) {
      // 步骤 1: 根据 Content-Encoding 解压缩
      let decodedBody: Buffer = body;

      if (contentEncoding === "gzip") {
        try {
          decodedBody = zlib.gunzipSync(body);
        } catch (error) {
          Logger.warn(
            `解压缩失败 (gzip): ${error instanceof Error ? error.message : "未知错误"}`,
            "InspectService",
          );
          return `[压缩数据解压失败] (${body.length} bytes)`;
        }
      } else if (contentEncoding === "deflate") {
        try {
          decodedBody = zlib.inflateSync(body);
        } catch (error) {
          Logger.warn(
            `解压缩失败 (deflate): ${error instanceof Error ? error.message : "未知错误"}`,
            "InspectService",
          );
          return `[压缩数据解压失败] (${body.length} bytes)`;
        }
      } else if (contentEncoding === "br") {
        try {
          decodedBody = zlib.brotliDecompressSync(body);
        } catch (error) {
          Logger.warn(
            `解压缩失败 (brotli): ${error instanceof Error ? error.message : "未知错误"}`,
            "InspectService",
          );
          return `[压缩数据解压失败] (${body.length} bytes)`;
        }
      }

      // 步骤 2: 根据 Content-Type 处理
      if (contentType.includes("application/json")) {
        try {
          const text = decodedBody.toString("utf8");
          JSON.parse(text); // 验证 JSON
          return text;
        } catch {
          return `[invalid JSON] (${decodedBody.length} bytes)`;
        }
      } else if (
        contentType.includes("text/") ||
        contentType.includes("application/xml") ||
        contentType.includes("application/javascript")
      ) {
        // 文本类型
        return decodedBody.toString("utf8");
      } else {
        // 二进制类型
        return `[binary data] (${decodedBody.length} bytes)`;
      }
    }

    // 如果是字符串，直接返回（旧格式的兼容）
    return body;
  }

  /**
   * 记录请求日志
   */
  logRequest(log: Omit<RequestLog, 'entryType'>): void {
    // 处理请求体（解压缩和文本检测）
    const processedBody = this.processHttpBody(log.body, log.headers);

    // 控制台日志
    this.logger.log(`📥 ${log.serviceName} Request: ${log.method} ${log.url}`);
    this.logger.debug(`Request Headers: ${JSON.stringify(log.headers)}`);

    // 记录请求体内容（调试级别）
    if (processedBody) {
      this.logger.debug(`Request Body: ${processedBody}`);
    }

    // SSE 广播
    if (this.sseService.hasClients()) {
      // 创建新的日志对象，确保 body 是字符串
      const broadcastLog = {
        ...log,
        body: processedBody,
        entryType: 'request' as const,
      };

      this.sseService.broadcast({
        type: "request",
        data: broadcastLog,
        icon: "📥",
        message: `${log.serviceName} Request: ${log.method} ${log.url}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录响应日志
   */
  logResponse(log: Omit<ResponseLog, 'entryType'>): void {
    const statusIcon =
      log.statusCode >= 400 ? "❌" : log.statusCode >= 300 ? "🔄" : "✅";

    // 处理响应体（使用标准流程）
    const processedBody = this.processHttpBody(log.body, log.headers);

    // 控制台日志
    this.logger[log.statusCode >= 400 ? "warn" : "debug"](
      `${statusIcon} ${log.serviceName} Response: ${log.method} ${log.url} -> ${log.statusCode}`,
    );

    // 记录响应体内容（调试级别）
    this.logger.debug(`服务器响应内容 (${log.statusCode}): ${processedBody}`);

    // SSE 广播
    if (this.sseService.hasClients()) {
      // 创建新的日志对象，确保 body 是字符串
      const broadcastLog = {
        ...log,
        body: processedBody,
        entryType: 'response' as const,
      };

      this.sseService.broadcast({
        type: "response",
        data: broadcastLog,
        icon: statusIcon,
        message: `${log.serviceName} Response: ${log.method} ${log.url} -> ${log.statusCode}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录错误日志
   */
  logError(log: Omit<ErrorLog, 'entryType'>): void {
    // 控制台日志
    this.logger.error(`Proxy error: ${log.error}`, log.stack);

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "error",
        data: {
          ...log,
          entryType: 'error' as const,
        },
        icon: "💥",
        message: `Proxy error: ${log.error}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录 WebSocket 消息日志
   */
  logWebSocketMessage(log: Omit<WebSocketLog, 'entryType'>): void {
    const direction = log.direction === "client-to-server" ? "→" : "←";
    const dataType = log.isBinary ? "BINARY" : "TEXT";

    // 控制台日志
    this.logger.debug(
      `🔌 ${log.serviceName} WebSocket ${direction}: ${dataType} (${log.body.length} bytes)`,
    );

    // 记录消息内容（调试级别）
    if (!log.isBinary && log.body.length > 0) {
      this.logger.debug(`WebSocket ${direction} 内容: ${log.body}`);
    }

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "websocket",
        data: {
          ...log,
          entryType: 'websocket' as const,
        },
        icon: "🔌",
        message: `${log.serviceName} WebSocket ${direction}: ${dataType} (${log.body.length} bytes)`,
        timestamp: log.timestamp,
      });
    }
  }
}
