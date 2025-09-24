import { Module } from "@nestjs/common";
import { InspectController } from "./controllers/inspect.controller";
import { InspectService } from "./services/inspect.service";
import { SseService } from "./services/sse.service";

@Module({
  controllers: [InspectController],
  providers: [InspectService, SseService],
  exports: [InspectService, SseService],
})
export class InspectModule {}
