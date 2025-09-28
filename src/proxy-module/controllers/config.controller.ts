import { Controller, Get } from "@nestjs/common";
import { AppConfigService } from "../../app-config-module/services/app-config.service";
import { SseService } from "../../inspect-module/services/sse.service";
import { MetricsService } from "../services/metrics.service";

@Controller("fusion/config")
export class ConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly sseService: SseService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get("dashboard")
  getDashboardData() {
    return {
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
