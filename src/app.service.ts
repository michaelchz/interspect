import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * 应用初始化方法，在模块启动时调用
   */
  initialize(): void {
    this.logger.log("Initializing server...");
    this.logger.log("Application started successfully!");
  }

  getHello(): string {
    return "Hello World!";
  }
}
