import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WebSocketGateway } from "./services/websocket.gateway";
import { InspectModule } from "../inspect-module/inspect.module";
import { ProxyModule } from "../proxy-module/proxy.module";

@Module({
  imports: [ConfigModule, InspectModule, ProxyModule],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
