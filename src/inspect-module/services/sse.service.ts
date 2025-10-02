import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Request, Response } from 'express';

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
   * 添加 SSE 客户端并启动心跳
   */
  addClient(id: string, response: Response, request: Request): void {
    const client: SseClient = { id, response };
    this.clients.set(id, client);

    // 发送连接确认
    try {
      if (!response.writableEnded) {
        response.write(':connected\n\n');
      }
    } catch (error) {
      this.logger.error('Failed to send connected message:', error);
    }

    // 启动心跳
    this.startHeartbeat(client);

    // 设置连接关闭处理
    request.on('close', () => {
      this.removeClient(id);
    });

    this.logger.log(`SSE client connected: ${id}, total clients: ${this.clients.size}`);
  }

  /**
   * 启动客户端心跳
   */
  private startHeartbeat(client: SseClient): void {
    client.heartbeatInterval = setInterval(() => {
      if (client.response.writableEnded) {
        this.removeClient(client.id);
        return;
      }

      try {
        const heartbeatData = {
          type: 'heartbeat',
          message: 'heartbeat',
          timestamp: new Date().toISOString(),
        };
        const message = `data: ${JSON.stringify(heartbeatData)}\n\n`;
        client.response.write(message);
      } catch (error) {
        this.logger.error(`Failed to send heartbeat to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    }, 7000); // 7秒
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
      this.logger.log(`SSE client disconnected: ${id}, total clients: ${this.clients.size}`);
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
   * 模块销毁时清理所有连接
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up all SSE connections...');

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
              type: 'shutdown',
              message: 'Server is shutting down',
              timestamp: new Date().toISOString(),
            })}\n\n`
          );
          client.response.end();
        }
      } catch (error) {
        this.logger.error(`Error closing connection ${id}:`, error);
      }
    }

    this.clients.clear();
    this.logger.log('All SSE connections cleaned up');
  }
}
