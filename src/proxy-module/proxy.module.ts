import { Module, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpProxy } from "./services/http.proxy";
import { WebSocketGateway } from "./services/websocket.gateway";
import { InspectModule } from "../inspect-module/inspect.module";
import { MetricsService } from "./services/metrics.service"; // New import path
import { MetricsController } from "./controllers/metrics.controller"; // New import
import * as http from "http";
import * as https from "https";
import { AgentMetricsService } from "./services/agent-metrics.service";

// Agents for HttpProxy
const httpProxyHttpAgent = new http.Agent({
  keepAlive: false, // 禁用连接复用，避免 socket hang up
  maxSockets: Infinity,
  maxFreeSockets: 0,
  timeout: 120000,
});
const httpProxyHttpsAgent = new https.Agent({
  keepAlive: false, // 禁用连接复用，避免 socket hang up
  maxSockets: Infinity,
  maxFreeSockets: 0,
  timeout: 120000,
});

@Module({
  imports: [ConfigModule, InspectModule],
  controllers: [MetricsController],
  providers: [
    HttpProxy,
    WebSocketGateway,
    Logger,
    MetricsService,
    AgentMetricsService,
    {
      provide: "STATIC_HTTP_AGENT",
      useValue: httpProxyHttpAgent,
    },
    {
      provide: "STATIC_HTTPS_AGENT",
      useValue: httpProxyHttpsAgent,
    },
  ],
  exports: [MetricsService, WebSocketGateway],
})
export class ProxyModule implements OnModuleDestroy {
  onModuleDestroy() {
    httpProxyHttpAgent.destroy();
    httpProxyHttpsAgent.destroy();
  }
}
