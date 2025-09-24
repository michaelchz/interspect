import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WebSocketGateway } from "./websocket-module/services/websocket.gateway";
import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as http from "http";
import { FileLogger } from "./common/utils/file-logger.service";
import { join } from "path";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new FileLogger("./data/logs"),
    bodyParser: false, // 禁用 NestJS 全局 body parser
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // 启用优雅关机钩子
  // 这会在收到终止信号时，自动调用 app.close()，
  // 从而触发 onModuleDestroy、beforeApplicationShutdown 等生命周期钩子。
  app.enableShutdownHooks();

  // 先注册静态服务
  app.use("/fusion", express.static(join(__dirname, "..", "dist", "public")));

  // 重要：代理路由必须在中间件之前注册
  // 这样代理可以直接访问原始请求流
  console.log(">>> Setting up raw proxy handler...");
  app.use(
    (
      req: Request & { rawBodyNeeded?: boolean },
      res: Response,
      next: NextFunction,
    ) => {
      if (req.path.startsWith("/api/")) {
        console.log(
          ">>> Intercepting API request for proxy:",
          req.method,
          req.path,
        );
        // 这里我们仍然需要让代理处理，但是标记这是一个需要原始流的请求
        req.rawBodyNeeded = true;
      }
      next();
    },
  );

  // 初始化 WebSocket 服务器
  const server = app.getHttpServer() as unknown as http.Server;
  const webSocketGateway = app.get<WebSocketGateway>(WebSocketGateway);
  webSocketGateway.initialize(server);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
