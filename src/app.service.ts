import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProxyMetricsService } from "./inspect-module/services/proxy-metrics.service";
import { AgentMetricsService } from "./inspect-module/services/agent-metrics.service";
import { SseService } from "./inspect-module/services/sse.service";
import type { Request, Response } from "express";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyMetricsService: ProxyMetricsService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly sseService: SseService,
  ) {}

  /**
   * 应用初始化方法，在模块启动时调用
   */
  initialize(): void {
    this.logger.log("Initializing server...");
    this.logger.log("Application started successfully!");
  }

  /**
   * 生成客户端ID
   */
  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      status: "ok",
      message: "Inspect module is running",
      timestamp: new Date().toISOString(),
      endpoints: {
        sse: "/interspect/sse",
        metrics: "/interspect/metrics",
      },
    };
  }

  /**
   * 获取仪表盘指标
   */
  getDashboardMetrics() {
    const generalMetrics = this.proxyMetricsService.getMetrics();
    const agentStatus = this.agentMetricsService.getAllAgentStatuses();
    const uptime = this.proxyMetricsService.getUptime();

    return {
      agentStatus,
      ...generalMetrics,
      uptime,
      environment: {
        targetServerUrl: this.configService.get<string>('TARGET_SERVER_URL') || '',
      },
      interspect: {
        sseConnections: this.sseService.getClientCount(),
        uptime: this.proxyMetricsService.getUptime(),
      },
    };
  }

  /**
   * 添加SSE客户端
   */
  addSseClient(clientId: string, res: Response, req: Request): void {
    this.sseService.addClient(clientId, res, req);
  }
}
