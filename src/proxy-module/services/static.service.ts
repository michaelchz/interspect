import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { AppConfigService } from "../../app-config-module/services/app-config.service";
import { createProxyServer } from "http-proxy";
import { IncomingMessage } from "http";
import { Request, Response } from "express";
import * as http from "http";
import * as https from "https";
import { MetricsService } from "./metrics.service";
import { InspectService } from "../../inspect-module/services/inspect.service";

type ProxyServer = ReturnType<typeof createProxyServer>;

@Injectable()
export class StaticService implements OnModuleDestroy {
  private readonly logger: Logger;
  private readonly proxy: ProxyServer;
  private readonly targetServerUrl: string;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly metricsService: MetricsService,
    @Inject("STATIC_HTTP_AGENT") private readonly httpAgent: http.Agent,
    @Inject("STATIC_HTTPS_AGENT") private readonly httpsAgent: https.Agent,
    private readonly inspectService: InspectService,
  ) {
    this.logger = new Logger(StaticService.name);

    this.targetServerUrl = this.appConfigService.targetServerUrl;

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

    this.setupProxyListeners(this.proxy, 0);

    this.logger.log(
      `${StaticService.name} initialized with target server: ${this.targetServerUrl}`,
    );
  }

  private setupProxyListeners(proxy: ProxyServer, serverIndex: number): void {
    // 监听代理请求事件
    proxy.on(
      "proxyReq",
      (proxyReq: http.ClientRequest, req: IncomingMessage) => {
        // 收集请求体数据
        let requestBody = "";
        let isTextData = true;

        // 监听请求数据
        req.on("data", (chunk) => {
          // 检查是否为文本数据
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          if (!buffer.toString("utf8").includes("�")) {
            requestBody += buffer.toString("utf8");
          } else {
            isTextData = false;
          }
        });

        req.on("end", () => {
          // 调用 inspect service 记录请求日志（包含 body）
          this.inspectService.logRequest({
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: isTextData ? requestBody : "[binary data]",
            serverIndex,
            serviceName: StaticService.name,
            timestamp: new Date().toISOString(),
          });
        });
      },
    );

    proxy.on("error", (err, _req, res: http.ServerResponse) => {
      // 调用 inspect service 记录错误日志
      this.inspectService.logError({
        error: err.message,
        stack: err.stack,
        serverIndex,
        serviceName: StaticService.name,
        timestamp: new Date().toISOString(),
      });

      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: `Internal ${StaticService.name} error (server ${serverIndex})`,
          }),
        );
      }
    });

    proxy.on("proxyRes", (proxyRes: IncomingMessage, req: IncomingMessage) => {
      const statusCode = proxyRes.statusCode ?? 0;
      this.metricsService.incrementStaticHttpCode(statusCode);

      // 收集响应内容
      let responseBody = "";
      let isResponseText = true;

      // 监听响应数据
      proxyRes.on("data", (chunk) => {
        // 检查是否为文本数据
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (!buffer.toString("utf8").includes("�")) {
          responseBody += buffer.toString("utf8");
        } else {
          isResponseText = false;
        }
      });

      req.on("close", () => proxyRes.destroy());

      proxyRes.on("end", () => {
        // 调用 inspect service 记录完整响应日志
        this.inspectService.logResponse({
          method: req.method,
          url: req.url,
          statusCode,
          headers: proxyRes.headers,
          body: isResponseText ? responseBody : "[binary data]",
          serverIndex,
          serviceName: StaticService.name,
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