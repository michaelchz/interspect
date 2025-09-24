import { Controller, Get } from "@nestjs/common";
import { AppConfigService } from "../../app-config-module/services/app-config.service";

@Controller("fusion/config")
export class ConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get("dashboard")
  getDashboardData() {
    return {
      environment: {
        targetServerUrl: this.appConfigService.targetServerUrl,
      },
    };
  }
}
