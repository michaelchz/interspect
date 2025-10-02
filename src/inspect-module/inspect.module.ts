import { Module } from '@nestjs/common';
import { InspectService } from './services/inspect.service';
import { SseService } from './services/sse.service';
import { ProxyMetricsService } from './services/proxy-metrics.service';
import { AgentMetricsService } from './services/agent-metrics.service';

@Module({
  controllers: [],
  providers: [InspectService, SseService, ProxyMetricsService, AgentMetricsService],
  exports: [InspectService, SseService, ProxyMetricsService, AgentMetricsService],
})
export class InspectModule {}
