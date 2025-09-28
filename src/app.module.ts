import { Module, OnModuleInit } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { InspectModule } from "./inspect-module/inspect.module";
import { ProxyModule } from "./proxy-module/proxy.module";
import { WebSocketModule } from "./websocket-module/websocket.module";

@Module({
  imports: [InspectModule, ProxyModule, WebSocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly appService: AppService) {}

  onModuleInit() {
    this.appService.initialize();
  }
}
