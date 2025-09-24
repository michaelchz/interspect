import { Controller, Get, Res, Req, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { SseService } from "../services/sse.service";

@Controller("inspect")
export class InspectController {
  private readonly logger = new Logger(InspectController.name);

  constructor(private readonly sseService: SseService) {}

  @Get()
  getStatus() {
    return {
      status: "ok",
      message: "Inspect module is running",
      timestamp: new Date().toISOString(),
      endpoints: {
        sse: "/inspect/sse",
      },
    };
  }

  @Get("sse")
  sendEvents(@Res() res: Response, @Req() req: Request) {
    // 设置 SSE 相关 header
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // 生成客户端 ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 添加客户端到 SSE 服务
    this.sseService.addClient(clientId, res);

    // 发送连接成功消息
    res.write(
      `data: ${JSON.stringify({
        type: "connection",
        message: "SSE connection established",
        clientId,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );

    this.logger.log(`SSE connection established: ${clientId}`);

    // 心跳定时器 - 每 10 秒发送一次心跳
    const heartbeatInterval = setInterval(() => {
      if (res.writableEnded) {
        this.sseService.removeClient(clientId);
        return;
      }

      try {
        res.write(
          `data: ${JSON.stringify({
            type: "heartbeat",
            message: "heartbeat",
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send heartbeat to client ${clientId}:`,
          error,
        );
        this.sseService.removeClient(clientId);
      }
    }, 10000); // 10 秒

    // 将心跳定时器存储到 SSE 服务中
    this.sseService.setHeartbeatInterval(clientId, heartbeatInterval);

    // 当客户端关闭连接时
    req.on("close", () => {
      this.sseService.removeClient(clientId);
      this.logger.log(`SSE connection closed: ${clientId}`);
    });
  }
}
