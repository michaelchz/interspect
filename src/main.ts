import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { FileLogger } from './common/utils/file-logger.service';
import { setupApplication } from './common/bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new FileLogger('./data/logs'),
    bodyParser: false, // 禁用 NestJS 全局 body parser
  });

  // 启用优雅关机钩子：这会在收到终止信号时，自动调用 app.close()，
  // 从而触发 onModuleDestroy、beforeApplicationShutdown 等生命周期钩子。
  app.enableShutdownHooks();

  // 设置应用程序配置（过滤器、静态资源、代理处理、WebSocket）
  setupApplication(app);

  // 获取端口配置并启动应用
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
}
void bootstrap();
