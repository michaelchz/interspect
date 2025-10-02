import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createProxyServer } from 'http-proxy';
import { IncomingMessage } from 'http';
import { Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';
import { ProxyMetricsService } from '../../inspect-module/services/proxy-metrics.service';
import { InspectService } from '../../inspect-module/services/inspect.service';
import { AgentMetricsService } from '../../inspect-module/services/agent-metrics.service';

type ProxyServer = ReturnType<typeof createProxyServer>;

@Injectable()
export class HttpProxy implements OnModuleDestroy {
  private readonly logger = new Logger(HttpProxy.name);
  private readonly proxy: ProxyServer;
  private readonly targetServerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: ProxyMetricsService,
    @Inject('STATIC_HTTP_AGENT') private readonly httpAgent: http.Agent,
    @Inject('STATIC_HTTPS_AGENT') private readonly httpsAgent: https.Agent,
    private readonly inspectService: InspectService,
    private readonly agentMetricsService: AgentMetricsService
  ) {
    this.targetServerUrl =
      this.configService.get<string>('TARGET_SERVER_URL') ??
      (() => {
        throw new Error('缺少配置: TARGET_SERVER_URL');
      })();

    // 创建代理实例
    // - Docker环境下，访问静态视频时，目标服务器不会释放连接，需要设置超时机制回收
    this.proxy = createProxyServer({
      target: this.targetServerUrl,
      changeOrigin: true,
      selfHandleResponse: false,
      followRedirects: false,
      agent: this.targetServerUrl.startsWith('https') ? this.httpsAgent : this.httpAgent,
      proxyTimeout: 60000,
      timeout: 60000,
    });

    // 将 agent 传递给 AgentMetricsService
    this.agentMetricsService.setStaticAgents(this.httpAgent, this.httpsAgent);
    this.setupProxyListeners();
    this.logger.log(`Initialized with target server: ${this.targetServerUrl}`);
  }

  /** 初始化代理事件监听 */
  private setupProxyListeners(): void {
    this.proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => this.handleProxyRequest(req));
    this.proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) =>
      this.handleProxyResponse(proxyRes, req)
    );
    this.proxy.on('error', (err, _req, res: http.ServerResponse) =>
      this.handleProxyError(err, res)
    );
  }

  /** 处理代理请求日志 */
  private handleProxyRequest(req: IncomingMessage): void {
    this.collectBody(req, (body) => {
      this.inspectService.logRequest({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /** 处理代理响应日志 */
  private handleProxyResponse(proxyRes: IncomingMessage, req: IncomingMessage): void {
    const statusCode = proxyRes.statusCode ?? 0;
    this.metricsService.incrementStaticHttpCode(statusCode);

    this.collectBody(proxyRes, (body) => {
      this.inspectService.logResponse({
        method: req.method,
        url: req.url,
        statusCode,
        headers: proxyRes.headers,
        body,
        timestamp: new Date().toISOString(),
      });
    });

    req.on('close', () => proxyRes.destroy());
  }

  /** 处理代理错误 */
  private handleProxyError(err: Error, res: http.ServerResponse): void {
    this.inspectService.logError({
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Internal ${HttpProxy.name} error` }));
    }
  }

  /** 工具方法：收集请求或响应 body */
  private collectBody(stream: IncomingMessage, callback: (body: Buffer | '') => void): void {
    const chunks: Buffer<ArrayBufferLike>[] = [];
    stream.on('data', (chunk: string | Buffer) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on('end', () => callback(chunks.length ? Buffer.concat(chunks) : ''));
  }

  /** 模块销毁时关闭代理 */
  onModuleDestroy(): void {
    this.logger.log('Closing proxy server...');
    this.proxy.close?.();
  }

  /** 转发请求到目标服务器 */
  public forwardRequest(req: Request, res: Response): void {
    if (!this.proxy) {
      this.sendErrorResponse(res, 'Proxy not initialized');
      return;
    }
    this.metricsService.incrementStaticRequest();
    this.proxy.web(req, res);
  }

  /** 工具方法：返回统一的错误响应 */
  private sendErrorResponse(res: Response, message: string): void {
    res.status(500).json({ message });
  }
}
