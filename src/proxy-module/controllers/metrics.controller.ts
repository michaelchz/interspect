import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProxyMetricsService } from "../services/proxy-metrics.service";
import { AgentMetricsService } from "../services/agent-metrics.service";
import { SseService } from "../../inspect-module/services/sse.service";

@Controller("interspect/metrics")
export class MetricsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly proxyMetricsService: ProxyMetricsService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly sseService: SseService,
  ) {}

  @Get()
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
}
