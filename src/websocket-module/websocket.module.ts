import { Module } from "@nestjs/common";
import { AppConfigModule } from "../app-config-module/app-config.module";
import { WebSocketGateway } from "./services/websocket.gateway";
import { InspectModule } from "../inspect-module/inspect.module";
import { ProxyModule } from "../proxy-module/proxy.module";

@Module({
  imports: [AppConfigModule, InspectModule, ProxyModule],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
