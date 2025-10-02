import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InspectModule } from './inspect-module/inspect.module';
import { ProxyModule } from './proxy-module/proxy.module';

@Module({
  imports: [ConfigModule.forRoot(), InspectModule, ProxyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly appService: AppService) {}

  onModuleInit() {
    this.appService.initialize();
  }
}
