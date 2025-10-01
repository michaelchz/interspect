import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetricsService } from "../services/metrics.service";
import { AgentMetricsService } from "../services/agent-metrics.service";
import { SseService } from "../../inspect-module/services/sse.service";

@Controller("interspect/metrics")
export class MetricsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly sseService: SseService,
  ) {}

  @Get()
  getDashboardMetrics() {
    const generalMetrics = this.metricsService.getMetrics();
    const agentStatus = this.agentMetricsService.getAllAgentStatuses();
    const uptime = this.metricsService.getUptime();

    return {
      agentStatus,
      ...generalMetrics,
      uptime,
      environment: {
        targetServerUrl: this.configService.get<string>('TARGET_SERVER_URL') || '',
      },
      interspect: {
        sseConnections: this.sseService.getClientCount(),
        uptime: this.metricsService.getUptime(),
      },
    };
  }
}
