import { Injectable, Logger } from "@nestjs/common";
import { SseService } from "./sse.service";
import * as zlib from "zlib";
import { IncomingHttpHeaders } from "http";
import { RawData } from "ws";

// 日志数据接口
interface RequestLog {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string | Buffer | undefined;
  timestamp: string;
  entryType: "request";
}

interface ResponseLog {
  method: string | undefined;
  url: string | undefined;
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string | Buffer | undefined;
  timestamp: string;
  entryType: "response";
}

interface ErrorLog {
  error: string;
  stack?: string;
  timestamp: string;
  entryType: "error";
}

interface WebSocketLog {
  direction: "client-to-server" | "server-to-client";
  body: RawData | string; // RawData + string
  isBinary: boolean;
  timestamp: string;
  entryType: "websocket";
}

@Injectable()
export class InspectService {
  private readonly logger = new Logger(InspectService.name);

  constructor(private readonly sseService: SseService) {}

  /**
   * 处理 WebSocket 消息数据
   */
  private processWebSocketMessage(data: RawData | string, isBinary: boolean): string {
    if (isBinary) {
      return "◆◇[BINARY_DATA]◇◆";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data instanceof Buffer) {
      return data.toString("utf8");
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString("utf8");
    }

    // 处理Buffer数组
    if (Array.isArray(data)) {
      return Buffer.concat(data).toString("utf8");
    }

    return "[unknown data type]";
  }

  /**
   * 通用的 HTTP Body 处理方法
   */
  private processHttpBody(
    body: string | Buffer | undefined,
    headers: IncomingHttpHeaders,
  ): string | undefined {
    if (!body) return undefined;

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
      // 步骤 1: 根据 Content-Type 判断是否为二进制数据
      // 如果是二进制类型，跳过解压缩，直接返回标识
      if (!contentType.includes("text/") &&
          !contentType.includes("application/json") &&
          !contentType.includes("application/xml") &&
          !contentType.includes("application/javascript") &&
          !contentType.includes("application/x-javascript") &&
          !contentType.includes("application/x-www-form-urlencoded")) {
        // 二进制类型，跳过解压缩直接返回
        return `◆◇[BINARY_DATA:${body.length}bytes]◇◆`;
      }

      // 步骤 2: 只有文本数据才进行解压缩
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

      // 步骤 3: 处理文本内容
      if (contentType.includes("application/json")) {
        try {
          const text = decodedBody.toString("utf8");
          JSON.parse(text); // 验证 JSON
          return text;
        } catch {
          return `[invalid JSON] (${decodedBody.length} bytes)`;
        }
      } else {
        // 其他文本类型
        return decodedBody.toString("utf8");
      }
    }

    // 如果是字符串，直接返回（旧格式的兼容）
    return body;
  }

  /**
   * 记录请求日志
   */
  logRequest(log: Omit<RequestLog, "entryType">): void {
    // 处理请求体（解压缩和文本检测）
    const processedBody = this.processHttpBody(log.body, log.headers);

    // 控制台日志
    this.logger.log(`📥 Request: ${log.method} ${log.url}`);
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
        entryType: "request" as const,
      };

      this.sseService.broadcast({
        type: "request",
        data: broadcastLog,
        icon: "📥",
        message: `Request: ${log.method} ${log.url}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录响应日志
   */
  logResponse(log: Omit<ResponseLog, "entryType">): void {
    const statusIcon =
      log.statusCode >= 400 ? "❌" : log.statusCode >= 300 ? "🔄" : "✅";

    // 处理响应体（使用标准流程）
    const processedBody = this.processHttpBody(log.body, log.headers);

    // 控制台日志
    this.logger[log.statusCode >= 400 ? "warn" : "debug"](
      `${statusIcon} Response: ${log.method} ${log.url} -> ${log.statusCode}`,
    );

    // 记录响应体内容（调试级别）
    this.logger.debug(`服务器响应内容 (${log.statusCode}): ${processedBody}`);

    // SSE 广播
    if (this.sseService.hasClients()) {
      // 创建新的日志对象，确保 body 是字符串
      const broadcastLog = {
        ...log,
        body: processedBody,
        entryType: "response" as const,
      };

      this.sseService.broadcast({
        type: "response",
        data: broadcastLog,
        icon: statusIcon,
        message: `Response: ${log.method} ${log.url} -> ${log.statusCode}`,
        timestamp: log.timestamp,
      });
    }
  }

  /**
   * 记录错误日志
   */
  logError(log: Omit<ErrorLog, "entryType">): void {
    // 控制台日志
    this.logger.error(`Proxy error: ${log.error}`, log.stack);

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "error",
        data: {
          ...log,
          entryType: "error" as const,
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
  logWebSocketMessage(log: Omit<WebSocketLog, "entryType">): void {
    const direction = log.direction === "client-to-server" ? "→" : "←";
    const dataType = log.isBinary ? "BINARY" : "TEXT";

    // 处理消息数据
    const processedBody = this.processWebSocketMessage(log.body, log.isBinary);
    let bodyLength = 0;
    if (typeof log.body === 'string') {
      bodyLength = log.body.length;
    } else if (Buffer.isBuffer(log.body)) {
      bodyLength = log.body.length;
    } else if (log.body instanceof ArrayBuffer) {
      bodyLength = log.body.byteLength;
    } else if (Array.isArray(log.body)) {
      // Buffer数组
      bodyLength = log.body.reduce((sum, buffer) => sum + buffer.length, 0);
    }

    // 控制台日志
    this.logger.debug(
      `🔌 WebSocket ${direction}: ${dataType} (${bodyLength} bytes)`,
    );

    // 记录消息内容（调试级别）
    if (!log.isBinary && processedBody.length > 0) {
      this.logger.debug(`WebSocket ${direction} 内容: ${processedBody}`);
    }

    // SSE 广播
    if (this.sseService.hasClients()) {
      this.sseService.broadcast({
        type: "websocket",
        data: {
          ...log,
          body: processedBody,
          entryType: "websocket" as const,
        },
        icon: "🔌",
        message: `WebSocket ${direction}: ${dataType} (${bodyLength} bytes)`,
        timestamp: log.timestamp,
      });
    }
  }
}
