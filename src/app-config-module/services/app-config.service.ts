import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DashboardDto } from "../dto/dashboard.dto";

type EnvVarConfig = {
  default?: number | string | boolean;
  desc: string;
};

type EnvVars = {
  TARGET_SERVER_URL: string;
};

@Injectable()
export class AppConfigService {
  private static readonly ENV_VARS_TO_PRELOAD: Record<
    keyof EnvVars,
    EnvVarConfig
  > = {
    TARGET_SERVER_URL: { desc: "目标服务器URL" },
  };

  private readonly preloadedEnvVars: EnvVars;
  private readonly _targetServerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.preloadedEnvVars = Object.fromEntries(
      Object.entries(AppConfigService.ENV_VARS_TO_PRELOAD).map(
        ([key, config]) => {
          let value: number | string | boolean | undefined =
            this.configService.get(key) ?? config.default ?? undefined;

          // 处理布尔值
          if (typeof value === "string") {
            if (value.toLowerCase() === "true") value = true;
            else if (value.toLowerCase() === "false") value = false;
          }

          if (value === undefined) {
            throw new Error(`环境变量 ${key} 未配置，请设置此环境变量`);
          }
          return [key, value];
        },
      ),
    ) as EnvVars;

    this._targetServerUrl = this.loadTargetServer();
  }

  private getVar<K extends keyof EnvVars>(key: K): EnvVars[K] {
    return this.preloadedEnvVars[key];
  }

  /** 获取目标服务器 URL */
  get targetServerUrl() {
    return this._targetServerUrl;
  }

  /** 加载目标服务器配置 */
  private loadTargetServer(): string {
    const serverUrl = this.getVar("TARGET_SERVER_URL").trim();

    if (!serverUrl) {
      throw new Error("TARGET_SERVER_URL 配置无效，请提供有效的服务器URL");
    }

    return serverUrl;
  }

  /** 获取所有公开配置 */
  getPublicConfig(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.preloadedEnvVars).map(([k, v]) => [k, String(v)]),
    );
  }

  /** 获取仪表盘数据 */
  getDashboardData(): DashboardDto {
    return {
      environment: {
        targetServerUrl: this.getVar("TARGET_SERVER_URL"),
      },
    };
  }
}
