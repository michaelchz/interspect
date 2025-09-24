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

  getMetrics() {
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
    };
  }

  getUptime(): number {
    return Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
  }
}
