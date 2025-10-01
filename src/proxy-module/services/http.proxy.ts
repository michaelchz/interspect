import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createProxyServer } from "http-proxy";
import { IncomingMessage } from "http";
import { Request, Response } from "express";
import * as http from "http";
import * as https from "https";
import { ProxyMetricsService } from "./proxy-metrics.service";
import { InspectService } from "../../inspect-module/services/inspect.service";

type ProxyServer = ReturnType<typeof createProxyServer>;

@Injectable()
export class HttpProxy implements OnModuleDestroy {
  private readonly logger: Logger;
  private readonly proxy: ProxyServer;
  private readonly targetServerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: ProxyMetricsService,
    @Inject("STATIC_HTTP_AGENT") private readonly httpAgent: http.Agent,
    @Inject("STATIC_HTTPS_AGENT") private readonly httpsAgent: https.Agent,
    private readonly inspectService: InspectService,
  ) {
    this.logger = new Logger(HttpProxy.name);

    const targetServerUrl = this.configService.get<string>('TARGET_SERVER_URL');
    if (!targetServerUrl) {
      throw new Error('TARGET_SERVER_URL 环境变量未配置');
    }
    this.targetServerUrl = targetServerUrl;

    // 创建代理实例
    // - Docker环境下，访问静态视频时，目标服务器不会释放连接，需要设置超时机制回收
    this.proxy = createProxyServer({
      target: this.targetServerUrl,
      changeOrigin: true,
      selfHandleResponse: false,
      followRedirects: false,
      agent: this.targetServerUrl.startsWith("https")
        ? this.httpsAgent
        : this.httpAgent,
      proxyTimeout: 60000,
      timeout: 60000,
    });

    this.setupProxyListeners(this.proxy);

    this.logger.log(
      `${HttpProxy.name} initialized with target server: ${this.targetServerUrl}`,
    );
  }

  private setupProxyListeners(proxy: ProxyServer): void {
    // 监听代理请求事件
    proxy.on(
      "proxyReq",
      (proxyReq: http.ClientRequest, req: IncomingMessage) => {
        // 收集请求体数据
        const chunks: Buffer[] = [];

        // 监听请求数据
        req.on("data", (chunk: string | Buffer) => {
          // 收集所有数据，不判断是否为文本
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(buffer);
        });

        req.on("end", () => {
          // 传递原始数据给 InspectService 处理
          if (chunks.length > 0) {
            const data = Buffer.concat(chunks);

            // 调用 inspect service 记录请求日志（包含 body）
            this.inspectService.logRequest({
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: data, // 直接传递 Buffer
              timestamp: new Date().toISOString(),
            });
          } else {
            // 没有请求体
            this.inspectService.logRequest({
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: "",
              timestamp: new Date().toISOString(),
            });
          }
        });
      },
    );

    proxy.on("error", (err, _req, res: http.ServerResponse) => {
      // 调用 inspect service 记录错误日志
      this.inspectService.logError({
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: `Internal ${HttpProxy.name} error`,
          }),
        );
      }
    });

    proxy.on("proxyRes", (proxyRes: IncomingMessage, req: IncomingMessage) => {
      const statusCode = proxyRes.statusCode ?? 0;
      this.metricsService.incrementStaticHttpCode(statusCode);

      // 收集响应内容
      const responseChunks: Buffer[] = [];

      // 监听响应数据
      proxyRes.on("data", (chunk: string | Buffer) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseChunks.push(buffer);
      });

      req.on("close", () => proxyRes.destroy());

      proxyRes.on("end", () => {
        // 传递原始数据给 InspectService 处理
        let responseBody: string | Buffer = "";
        if (responseChunks.length > 0) {
          const data = Buffer.concat(responseChunks);
          responseBody = data; // 直接传递 Buffer
        }

        // 调用 inspect service 记录完整响应日志
        this.inspectService.logResponse({
          method: req.method,
          url: req.url,
          statusCode,
          headers: proxyRes.headers,
          body: responseBody,
          timestamp: new Date().toISOString(),
        });
      });
    });
  }

  onModuleDestroy(): void {
    this.logger.log("Closing proxy server...");
    if (typeof this.proxy.close === "function") {
      this.proxy.close();
    }
  }

  /**
   * 转发请求到目标服务器
   * @param req 请求对象
   * @param res 响应对象
   */
  public forwardRequest(req: Request, res: Response): void {
    if (!this.proxy) {
      this.logger.error("Proxy not initialized");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Proxy not initialized" }));
      return;
    }

    this.metricsService.incrementStaticRequest();
    this.proxy.web(req, res);
  }
}
