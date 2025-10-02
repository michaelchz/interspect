import { Module, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpProxy } from "./services/http.proxy";
import { WebSocketGateway } from "./services/websocket.gateway";
import { InspectModule } from "../inspect-module/inspect.module";
import * as http from "http";
import * as https from "https";

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
  controllers: [],
  providers: [
    HttpProxy,
    WebSocketGateway,
    Logger,
    {
      provide: "STATIC_HTTP_AGENT",
      useValue: httpProxyHttpAgent,
    },
    {
      provide: "STATIC_HTTPS_AGENT",
      useValue: httpProxyHttpsAgent,
    },
  ],
  exports: [WebSocketGateway],
})
export class ProxyModule implements OnModuleDestroy {
  onModuleDestroy() {
    httpProxyHttpAgent.destroy();
    httpProxyHttpsAgent.destroy();
  }
}
