import { Module, Logger, OnModuleDestroy } from "@nestjs/common";
import { StaticService } from "./services/static.service";
import { AppConfigModule } from "../app-config-module/app-config.module";
import { InspectModule } from "../inspect-module/inspect.module";
import { MetricsService } from "./services/metrics.service"; // New import path
import { MetricsController } from "./controllers/metrics.controller"; // New import
import { ConfigController } from "./controllers/config.controller";
import { ProxyController } from "./controllers/proxy.controller";
import { WebSocketModule } from "../websocket-module/websocket.module";
import * as http from "http";
import * as https from "https";
import { AgentMetricsService } from "./services/agent-metrics.service";

// Agents for StaticService
const staticHttpAgent = new http.Agent({
  keepAlive: false, // 禁用连接复用，避免 socket hang up
  maxSockets: Infinity,
  maxFreeSockets: 0,
  timeout: 120000,
});
const staticHttpsAgent = new https.Agent({
  keepAlive: false, // 禁用连接复用，避免 socket hang up
  maxSockets: Infinity,
  maxFreeSockets: 0,
  timeout: 120000,
});

@Module({
  imports: [AppConfigModule, WebSocketModule, InspectModule],
  controllers: [MetricsController, ConfigController, ProxyController],
  providers: [
    StaticService,
    Logger,
    MetricsService,
    AgentMetricsService,
    {
      provide: "STATIC_HTTP_AGENT",
      useValue: staticHttpAgent,
    },
    {
      provide: "STATIC_HTTPS_AGENT",
      useValue: staticHttpsAgent,
    },
  ],
  exports: [MetricsService],
})
export class ProxyModule implements OnModuleDestroy {
  onModuleDestroy() {
    staticHttpAgent.destroy();
    staticHttpsAgent.destroy();
  }
}
