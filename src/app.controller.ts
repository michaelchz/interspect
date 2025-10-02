import { Controller, Get, Res, Req, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('interspect/metrics')
  getDashboardMetrics() {
    return this.appService.getDashboardMetrics();
  }

  @Get('interspect/status')
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('interspect/sse')
  sendEvents(@Res() res: Response, @Req() req: Request) {
    // 设置 SSE 相关 header
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const clientId = this.appService.generateClientId();
    this.logger.log(`SSE client connecting: ${clientId}`);

    // 添加客户端到 SSE 服务
    this.appService.addSseClient(clientId, res, req);
  }
}
