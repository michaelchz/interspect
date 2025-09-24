import { URL } from "url";

export class UrlProcessor {
  private urlObject: URL;

  constructor(url: string | URL) {
    if (typeof url === "string") {
      this.urlObject = new URL(url, "http://dummy.base");
    } else {
      this.urlObject = url;
    }
  }

  /**
   * 获取指定key的参数值，忽略大小写。
   * @param key - 要查找的参数键。
   * @returns 参数值，如果未找到则返回 undefined。
   */
  get(key: string): { foundKey: string; value: string } | undefined {
    for (const [
      paramKey,
      paramValue,
    ] of this.urlObject.searchParams.entries()) {
      if (paramKey.toLowerCase() === key.toLowerCase()) {
        return { foundKey: paramKey, value: paramValue };
      }
    }
    return undefined;
  }

  /**
   * 设置指定key的参数值。如果key已存在，则更新其值；否则添加新的参数。
   * @param key - 要设置的参数键。
   * @param value - 要设置的参数值。
   */
  set(key: string, value: string): void {
    // 先删除所有匹配的key（不区分大小写），然后添加新的key-value对
    const keysToDelete: string[] = [];
    for (const paramKey of this.urlObject.searchParams.keys()) {
      if (paramKey.toLowerCase() === key.toLowerCase()) {
        keysToDelete.push(paramKey);
      }
    }
    keysToDelete.forEach((k) => this.urlObject.searchParams.delete(k));
    this.urlObject.searchParams.append(key, value);
  }

  /**
   * 删除指定key的参数，忽略大小写。
   * @param key - 要删除的参数键。
   */
  delete(key: string): void {
    const keysToDelete: string[] = [];
    for (const paramKey of this.urlObject.searchParams.keys()) {
      if (paramKey.toLowerCase() === key.toLowerCase()) {
        keysToDelete.push(paramKey);
      }
    }
    keysToDelete.forEach((k) => this.urlObject.searchParams.delete(k));
  }

  /**
   * 在整个URL字符串中替换指定的旧值。
   * @param oldValue - 要替换的旧值。
   * @param newValue - 替换成的新值。
   */
  replace(oldValue: string, newValue: string): void {
    const currentUrlString = this.urlObject.toString();
    const newUrlString = currentUrlString.replace(
      new RegExp(oldValue, "g"),
      newValue,
    );
    this.urlObject = new URL(newUrlString);
  }

  /**
   * 提取处理完成的URLSearchParams对象。
   * @returns 处理完成的URLSearchParams对象。
   */
  toURLSearchParams(): URLSearchParams {
    return this.urlObject.searchParams;
  }

  /**
   * 提取处理完成的URL字符串。此方法返回不包含协议、主机和端口的相对URL。
   * @returns 处理完成的相对URL字符串。
   */
  toUrlString(): string {
    return (
      this.urlObject.pathname +
      (this.urlObject.searchParams.toString()
        ? `?${this.urlObject.searchParams.toString()}`
        : "")
    );
  }
}
