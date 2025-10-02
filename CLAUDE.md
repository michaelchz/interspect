# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Interspect** 是一个基于 NestJS 11.x 构建的 API 网关项目，专注于提供代理服务、WebSocket 连接和静态文件服务。

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.9.2
- **运行时**: Node.js
- **测试**: Jest
- **代码规范**: ESLint + Prettier
- **HTTP 代理**: http-proxy
- **WebSocket**: ws

## 核心架构

### 代理服务架构

项目采用简洁的代理设计：

1. **HttpProxy** (`src/proxy-module/services/http.proxy.ts`): HTTP 代理服务实现
2. **WebSocketGateway** (`src/proxy-module/services/websocket.gateway.ts`): WebSocket 网关服务

### 服务实现设计

**HttpProxy** 提供：
- 基于 `http-proxy` 库的 HTTP/HTTPS 代理
- 连接池配置和超时控制
- 错误处理和日志记录
- 性能指标收集
- 请求/响应监控

**WebSocketGateway** 提供：
- 基于 `ws` 库的 WebSocket 服务器
- 客户端连接管理
- 消息双向代理（一对一）
- 连接状态监控和优雅关闭

### 连接池管理

HTTP 代理使用独立的 HTTP/HTTPS Agent（在 `proxy.module.ts` 中配置）：
- 禁用连接复用 (keepAlive: false) - 避免 socket hang up
- 最大连接数: Infinity，最大空闲连接: 0
- 超时时间: 120 秒
- Docker 环境下代理超时机制

### Bootstrap 初始化

`common/bootstrap/` 目录包含应用启动时的初始化逻辑：
- **filters.setup.ts**: 全局异常过滤器配置
- **http-proxy.setup.ts**: HTTP 代理路由配置
- **websocket-proxy.setup.ts**: WebSocket 网关配置
- **static-assets.setup.ts**: 静态资源配置（`/interspect/web` 路径）

## 常用开发命令

```bash
# 开发环境启动
npm run start:dev          # 带文件监听
npm run start:debug        # 带调试模式

# 生产构建和运行
npm run build              # 构建并注入版本
npm run start:prod         # 生产环境运行

# 代码质量
npm run lint               # ESLint 检查并修复
npm run format             # Prettier 格式化

# 测试
npm test                  # 运行所有测试
npm run test:watch        # 监听模式
npm run test:cov          # 生成覆盖率报告
npm run test:e2e          # E2E 测试
```

## 项目结构

核心模块：

- **proxy-module**: 代理服务核心，包含 HttpProxy 和 WebSocketGateway
- **inspect-module**: 请求/响应日志记录、SSE 服务和性能指标收集
- **common**: 公共模块，包含初始化逻辑、异常过滤器和工具类
  - **bootstrap/**: 应用启动初始化逻辑
  - **filters/**: 全局异常过滤器
  - **utils/**: 工具类（如文件日志服务）

### 关键设计模式

1. **依赖注入**: 使用 NestJS 的 DI 容器管理服务依赖
2. **模块化设计**: 代理和监控功能分离到独立模块
3. **Bootstrap 模式**: 应用启动时按顺序初始化各个组件
4. **代理模式**: HTTP 和 WebSocket 请求的透明转发

## 特殊目录

### `/public/`
静态文件服务目录（通过 `/interspect/web` 路径访问）：
- `index.html`: 主页面
- `components/`: 前端组件（包括 SSE 客户端和信息卡片）

## 开发注意事项

### 1. 新增代理服务
1. 在 `proxy-module/services/` 目录下创建新的代理服务
2. 使用 `http-proxy` 库或 `ws` 库实现代理逻辑
3. 在 `proxy.module.ts` 中注册服务并配置连接池
4. 集成 `InspectService` 进行监控

### 2. 错误处理
- 使用全局异常过滤器 (`AllExceptionsFilter`)
- 代理错误会自动记录到文件日志
- 重要错误通过 SSE 实时推送到前端

### 3. 性能优化
- 连接池禁用 keepAlive 避免 socket hang up
- 大文件传输使用流式处理
- 使用独立的 Agent 管理 HTTP/HTTPS 连接
- SSE 连接心跳检测（WebSocket 无心跳机制）

## 配置文件

### 构建配置
- `nest-cli.json`: NestJS CLI 配置，包含资源复制规则
- `tsconfig.json`: TypeScript 编译配置，目标 ES2023
- `tsconfig.build.json`: 生产环境编译配置

### 代码规范
- `eslint.config.mjs`: ESLint 配置，启用 TypeScript 检查
- 允许使用 `any` 类型
- 未使用变量检查（忽略 `_` 前缀）

### 部署说明

构建流程：
1. 运行 `npm run build` 构建 TypeScript 代码
2. 执行 `scripts/inject-version.js` 注入版本信息
3. 复制静态资源到 `dist/public`
4. 输出到 `dist/` 目录

生产环境启动：
- 使用 `npm run start:prod` 运行编译后的代码
- 通过环境变量配置端口和其他参数

### 环境变量
- `TARGET_SERVER_URL`: 目标服务器 URL（必需配置）
- `PORT`: 服务端口（默认 3000）
- 其他配置通过 `@nestjs/config` 模块管理，支持 .env 文件

## 重要技术细节

### 1. 文本和二进制数据处理
代理服务会自动检测传入数据：
- 文本数据：完整记录请求/响应体
- 二进制数据：记录为 `[binary data]`
- 检测机制：检查 UTF-8 编码是否包含替换字符 (�)

### 2. 错误处理策略
- 代理错误自动返回 500 状态码
- 错误信息包含服务名称和服务器索引
- 所有错误都记录到 inspect 服务
- 支持优雅降级

### 3. 监控系统
- **请求指标**: HTTP 状态码统计、请求数量统计
- **连接池监控**: Agent 指标收集（ sockets、待处理请求等）
- **实时推送**: 通过 SSE 推送到前端仪表盘
- **WebSocket 监控**: 消息双向追踪和广播统计

### 4. 版本注入机制
构建时执行 `scripts/inject-version.js`，将版本信息注入到前端 HTML：
```javascript
// 注入格式
window.APP_VERSION = "0.0.1";
window.BUILD_TIME = "2024-01-01T12:00:00.000Z";
```

### 5. TypeScript 配置要点
- 目标版本：ES2023
- 不允许隐式 any（noImplicitAny: true)
- 启用装饰器元数据
- 严格的 null 检查