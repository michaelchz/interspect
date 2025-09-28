import { Controller, Get } from "@nestjs/common";
import { MetricsService } from "../services/metrics.service";
import { AgentMetricsService } from "../services/agent-metrics.service";
import { AppConfigService } from "../../app-config-module/services/app-config.service";
import { SseService } from "../../inspect-module/services/sse.service";

@Controller("interspect/metrics")
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly appConfigService: AppConfigService,
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
        targetServerUrl: this.appConfigService.targetServerUrl,
      },
      interspect: {
        sseConnections: this.sseService.getClientCount(),
        uptime: this.metricsService.getUptime(),
      },
    };
  }
}
