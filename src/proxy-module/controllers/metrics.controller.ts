import { Controller, Get } from "@nestjs/common";
import { MetricsService } from "../services/metrics.service";
import { AgentMetricsService } from "../services/agent-metrics.service";

@Controller("fusion/metrics")
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly agentMetricsService: AgentMetricsService,
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
    };
  }
}
