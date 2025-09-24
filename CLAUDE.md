# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Interspect** 是一个基于 NestJS 11.x 构建的 API 网关项目，专注于提供代理服务、WebSocket 连接和静态文件服务。

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **运行时**: Node.js
- **测试**: Jest
- **代码规范**: ESLint + Prettier
- **HTTP 客户端**: Axios
- **WebSocket**: ws

## 核心架构

### 代理服务架构

项目采用简洁的代理设计：

1. **AbstractStaticService** (`src/proxy-module/services/abstract-static.service.ts`): 抽象基类，提供通用的代理功能
2. **StaticService** (`src/proxy-module/services/static.service.ts`): 静态代理实现，直接转发请求

### 抽象基类设计

`AbstractStaticService` 为所有代理服务提供：
- 统一的代理服务器管理
- 连接池配置和超时控制
- 错误处理和日志记录
- 性能指标收集
- 请求/响应监控

### 连接池管理

每个代理服务使用独立的 HTTP/HTTPS Agent：
- 禁用连接复用 (keepAlive: false) - 避免 socket hang up
- 最大连接数: Infinity，最大空闲连接: 0
- 超时时间: 120 秒
- Docker 环境下代理超时机制

### WebSocket 网关

- 每个客户端独立管理服务器连接
- 支持消息双向代理和广播
- 自动重连机制
- 连接状态管理和优雅关闭
- 与 inspect-service 集成进行消息监控

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

- **app-config-module**: 配置管理，支持环境变量和 .env 文件
- **proxy-module**: 代理服务核心，包含静态代理实现和性能指标收集
- **inspect-module**: 请求/响应日志记录、SSE 服务和错误监控
- **websocket-module**: WebSocket 网关服务，支持双向消息代理
- **common**: 工具类、异常过滤器和类型定义

### 关键设计模式

1. **抽象基类**: `AbstractStaticService` 为代理服务提供基础功能
2. **依赖注入**: 使用 NestJS 的 DI 容器管理服务依赖
3. **拦截器**: 用于请求/响应转换和监控
4. **通配符路由**: `ProxyController` 使用 `@All('*')` 捕获所有 HTTP 请求

## 特殊目录

### `/public/`
静态文件服务目录（通过 `/fusion` 路径访问）：
- `index.html`: 主页面
- `components/`: 前端组件（包括 SSE 客户端和信息卡片）

## 开发注意事项

### 1. 新增代理服务
1. 继承 `AbstractStaticService`
2. 实现特定的代理逻辑
3. 在 `proxy.module.ts` 中注册并配置连接池

### 2. 错误处理
- 使用全局异常过滤器 (`AllExceptionsFilter`)
- 代理错误会自动记录到文件日志
- 重要错误通过 SSE 实时推送到前端

### 3. 性能优化
- 连接池禁用 keepAlive 避免 socket hang up
- 大文件传输使用流式处理
- 使用独立的 Agent 管理不同服务的连接

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
- `TARGET_SERVER_URL`: 目标服务器 URL（单服务器）

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