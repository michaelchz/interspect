import { Injectable } from "@nestjs/common";

@Injectable()
export class MetricsService {
  // Static Service Metrics
  private staticRequestCount: number = 0;
  private staticHttpCounts: Map<number, number> = new Map();

  // Server Service Metrics (Dynamic Proxy)
  private serverRequestCount: number = 0;
  private serverHttpCounts: Map<number, number> = new Map();

  // Cached Service Metrics (Cache Proxy)
  private cacheProxyRequestCount: number = 0;
  private cacheHitCount: number = 0;
  private cacheStaleCount: number = 0; // For stale-while-revalidate
  private cacheForceRefreshCount: number = 0;
  private cacheMissCount: number = 0;

  // WebSocket Service Metrics
  private currentClientConnections: number = 0;
  private currentServerConnections: number = 0;
  private clientMessagesSent: number = 0;
  private clientMessagesReceived: number = 0;
  private serverMessagesSent: number = 0;
  private serverMessagesReceived: number = 0;
  private reconnectionSuccesses: number = 0;
  private reconnectionFailures: number = 0;
  private clientConnectionErrors: number = 0;
  private serverConnectionErrors: number = 0;
  private messageProcessingErrors: number = 0;
  private totalMessageProcessingTime: number = 0;
  private processedMessageCount: number = 0;

  // Uptime
  private readonly startTime = new Date();

  // --- Static Service ---
  incrementStaticRequest(): void {
    this.staticRequestCount++;
  }

  incrementStaticHttpCode(code: number): void {
    const count = this.staticHttpCounts.get(code) || 0;
    this.staticHttpCounts.set(code, count + 1);
  }

  // --- Server Service (Dynamic Proxy) ---
  incrementServerRequest(): void {
    this.serverRequestCount++;
  }

  incrementServerHttpCode(code: number): void {
    const count = this.serverHttpCounts.get(code) || 0;
    this.serverHttpCounts.set(code, count + 1);
  }

  // --- Cached Service (Cache Proxy) ---
  incrementCacheProxyRequest(): void {
    this.cacheProxyRequestCount++;
  }
  incrementCacheHit(): void {
    this.cacheHitCount++;
  }
  incrementCacheStale(): void {
    this.cacheStaleCount++;
  }
  incrementCacheForceRefresh(): void {
    this.cacheForceRefreshCount++;
  }
  incrementCacheMiss(): void {
    this.cacheMissCount++;
  }

  // --- WebSocket Service ---
  incrementClientConnections(): void {
    this.currentClientConnections++;
  }

  decrementClientConnections(): void {
    this.currentClientConnections = Math.max(
      0,
      this.currentClientConnections - 1,
    );
  }

  incrementServerConnections(): void {
    this.currentServerConnections++;
  }

  decrementServerConnections(): void {
    this.currentServerConnections = Math.max(
      0,
      this.currentServerConnections - 1,
    );
  }

  incrementClientMessagesSent(): void {
    this.clientMessagesSent++;
  }

  incrementClientMessagesReceived(): void {
    this.clientMessagesReceived++;
  }

  incrementServerMessagesSent(): void {
    this.serverMessagesSent++;
  }

  incrementServerMessagesReceived(): void {
    this.serverMessagesReceived++;
  }

  incrementReconnectionSuccess(): void {
    this.reconnectionSuccesses++;
  }

  incrementReconnectionFailure(): void {
    this.reconnectionFailures++;
  }

  incrementClientConnectionError(): void {
    this.clientConnectionErrors++;
  }

  incrementServerConnectionError(): void {
    this.serverConnectionErrors++;
  }

  incrementMessageProcessingError(): void {
    this.messageProcessingErrors++;
  }

  addMessageProcessingTime(timeMs: number): void {
    this.totalMessageProcessingTime += timeMs;
    this.processedMessageCount++;
  }

  getMetrics() {
    const averageMessageProcessingTime =
      this.processedMessageCount > 0
        ? this.totalMessageProcessingTime / this.processedMessageCount
        : 0;

    return {
      static: {
        requestCount: this.staticRequestCount,
        httpCounts: Object.fromEntries(this.staticHttpCounts),
      },
      server: {
        // Dynamic Proxy
        requestCount: this.serverRequestCount,
        httpCounts: Object.fromEntries(this.serverHttpCounts),
      },
      cached: {
        // Cache Proxy
        requestCount: this.cacheProxyRequestCount,
        hitCount: this.cacheHitCount,
        staleCount: this.cacheStaleCount,
        forceRefreshCount: this.cacheForceRefreshCount,
        missCount: this.cacheMissCount,
      },
      webSocket: {
        connections: {
          current: {
            clients: this.currentClientConnections,
            servers: this.currentServerConnections,
          },
        },
        messages: {
          clients: {
            sent: this.clientMessagesSent,
            received: this.clientMessagesReceived,
          },
          servers: {
            sent: this.serverMessagesSent,
            received: this.serverMessagesReceived,
          },
        },
        reconnections: {
          successes: this.reconnectionSuccesses,
          failures: this.reconnectionFailures,
        },
        errors: {
          clientConnections: this.clientConnectionErrors,
          serverConnections: this.serverConnectionErrors,
          messages: this.messageProcessingErrors,
        },
        performance: {
          averageMessageProcessingTime,
        },
      },
    };
  }

  getUptime(): number {
    return Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
  }
}
