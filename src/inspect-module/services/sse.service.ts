import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { Response } from "express";

export interface SseClient {
  id: string;
  response: Response;
  heartbeatInterval?: NodeJS.Timeout;
}

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private clients: Map<string, SseClient> = new Map();

  /**
   * 添加 SSE 客户端
   */
  addClient(id: string, response: Response): void {
    this.clients.set(id, { id, response });
    this.logger.log(
      `SSE client connected: ${id}, total clients: ${this.clients.size}`,
    );
  }

  /**
   * 移除 SSE 客户端
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      // 清理心跳定时器
      if (client.heartbeatInterval) {
        clearInterval(client.heartbeatInterval);
      }

      // 关闭响应
      if (!client.response.writableEnded) {
        client.response.end();
      }

      this.clients.delete(id);
      this.logger.log(
        `SSE client disconnected: ${id}, total clients: ${this.clients.size}`,
      );
    }
  }

  /**
   * 发送消息到所有 SSE 客户端
   */
  broadcast(data: any): void {
    if (this.clients.size === 0) return;

    const message = `data: ${JSON.stringify(data)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      try {
        client.response.write(message);
      } catch (error) {
        this.logger.error(`Failed to send message to client ${id}:`, error);
        this.removeClient(id);
      }
    }
  }

  /**
   * 获取当前连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 检查是否有客户端连接
   */
  hasClients(): boolean {
    return this.clients.size > 0;
  }

  /**
   * 设置客户端的心跳定时器
   */
  setHeartbeatInterval(id: string, interval: NodeJS.Timeout): void {
    const client = this.clients.get(id);
    if (client) {
      client.heartbeatInterval = interval;
    }
  }

  /**
   * 模块销毁时清理所有连接
   */
  onModuleDestroy(): void {
    this.logger.log("Cleaning up all SSE connections...");

    for (const [id, client] of this.clients.entries()) {
      // 清理心跳定时器
      if (client.heartbeatInterval) {
        clearInterval(client.heartbeatInterval);
      }

      // 发送关闭消息
      try {
        if (!client.response.writableEnded) {
          client.response.write(
            `data: ${JSON.stringify({
              type: "shutdown",
              message: "Server is shutting down",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          );
          client.response.end();
        }
      } catch (error) {
        this.logger.error(`Error closing connection ${id}:`, error);
      }
    }

    this.clients.clear();
    this.logger.log("All SSE connections cleaned up");
  }
}
