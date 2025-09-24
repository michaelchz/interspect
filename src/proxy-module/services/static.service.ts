import { Injectable, Inject } from "@nestjs/common";
import { AppConfigService } from "../../app-config-module/services/app-config.service";
import * as http from "http";
import * as https from "https";
import { MetricsService } from "./metrics.service";
import { AbstractStaticService } from "./abstract-static.service";
import { InspectService } from "../../inspect-module/services/inspect.service";

@Injectable()
export class StaticService extends AbstractStaticService {
  constructor(
    appConfigService: AppConfigService,
    metricsService: MetricsService,
    @Inject("STATIC_HTTP_AGENT") httpAgent: http.Agent,
    @Inject("STATIC_HTTPS_AGENT") httpsAgent: https.Agent,
    inspectService: InspectService,
  ) {
    super(
      appConfigService,
      metricsService,
      httpAgent,
      httpsAgent,
      StaticService.name,
      inspectService,
    );
  }
}
