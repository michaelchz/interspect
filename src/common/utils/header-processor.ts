export type Headers = Record<string, string | string[] | undefined>;

export class HeaderProcessor {
  private headers: Headers;

  constructor(initialHeaders: Headers) {
    // 复制一份，避免修改原始对象
    this.headers = { ...initialHeaders };
  }

  /**
   * 获取指定key的头部值，忽略大小写。
   * @param key - 要查找的header键。
   * @returns 头部值，如果未找到则返回 undefined。
   */
  get(key: string): string | string[] | undefined {
    for (const headerKey in this.headers) {
      if (headerKey.toLowerCase() === key.toLowerCase()) {
        return this.headers[headerKey];
      }
    }
    return undefined;
  }

  /**
   * 设置指定key的头部值。如果key已存在，则更新其值；否则添加新的头部。
   * @param key - 要设置的header键。
   * @param value - 要设置的header值。
   */
  set(key: string, value: string | string[]): void {
    // 优先使用原始key，如果不存在则使用提供的key
    let foundKey = key;
    for (const headerKey in this.headers) {
      if (headerKey.toLowerCase() === key.toLowerCase()) {
        foundKey = headerKey;
        break;
      }
    }
    this.headers[foundKey] = value;
  }

  /**
   * 删除指定key的头部，忽略大小写。
   * @param key - 要删除的header键。
   */
  delete(key: string): void {
    for (const headerKey in this.headers) {
      if (headerKey.toLowerCase() === key.toLowerCase()) {
        delete this.headers[headerKey];
        return;
      }
    }
  }

  /**
   * 获取指定key的头部值，并将其作为字符串返回。
   * 如果值是字符串数组，则将其合并为逗号分隔的字符串。
   * @param key - 要查找的header键。
   * @returns 头部值的字符串表示，如果未找到则返回 undefined。
   */
  getAsString(key: string): string | undefined {
    const value = this.get(key);
    if (Array.isArray(value)) {
      return value.join(", ");
    } else if (typeof value === "string") {
      return value;
    }
    return undefined;
  }

  private filter(excluded: string[]): this {
    const set = new Set(excluded.map((h) => h.toLowerCase()));
    this.headers = Object.fromEntries(
      Object.entries(this.headers).filter(
        ([key]) => !set.has(key.toLowerCase()),
      ),
    );
    return this;
  }

  /**
   * 过滤掉不应该在转发请求中携带的头部。
   */
  filterForRequest(): this {
    return this.filter([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
      "host",
      "accept-encoding",
      "content-length",
    ]);
  }

  /**
   * 过滤掉不应该在转发响应中携带的头部。
   */
  filterForResponse(): this {
    return this.filter([
      "connection",
      "keep-alive",
      "transfer-encoding",
      "content-length",
      "content-encoding",
    ]);
  }

  /**
   * 提取处理完成的头部记录。
   * @returns 处理完成的头部记录对象。
   */
  toRecord(): Headers {
    return this.headers;
  }
}
