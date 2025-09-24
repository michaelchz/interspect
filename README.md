# Interspect

基于 NestJS 11.x 构建的 API 协议分析工具，通过 HTTP 代理服务、WebSocket 代理服务，截取交互数据。

## 功能特性

- 🔀 **智能代理服务** - 高性能 HTTP/HTTPS 代理
- 📡 **WebSocket 网关** - 双向消息代理和广播功能
- 📊 **实时监控** - 请求/响应日志记录，性能指标收集
- 📱 **仪表盘界面** - 基于 Web 的实时监控仪表盘

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **运行时**: Node.js
- **测试**: Jest
- **代码规范**: ESLint + Prettier
- **WebSocket**: ws

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发环境启动

```bash
# 带文件监听的开发模式
npm run start:dev

# 带调试模式的开发环境
npm run start:debug
```

### 生产构建和运行

```bash
# 构建项目
npm run build

# 生产环境运行
npm run start:prod
```

## 项目结构

```
src/
├── app-config-module/     # 配置管理模块
├── proxy-module/         # 代理服务核心
│   ├── controllers/      # 控制器
│   └── services/         # 代理服务实现
├── inspect-module/       # 请求监控模块
│   ├── controllers/      # 监控控制器
│   └── services/         # 日志和 SSE 服务
├── websocket-module/     # WebSocket 网关
│   └── services/         # WebSocket 网关服务
└── common/              # 公共模块
    ├── filters/         # 异常过滤器
    ├── types/           # 类型定义
    └── utils/           # 工具类
```

## 核心模块

### 代理服务 (Proxy Module)

- **AbstractStaticService**: 抽象基类，提供通用的代理功能
- **StaticService**: 静态代理实现，直接转发请求
- **连接池管理**: 每个代理服务使用独立的 HTTP/HTTPS Agent
- **性能指标**: 实时收集请求统计和连接池指标

### 监控服务 (Inspect Module)

- **请求日志**: 完整记录请求和响应内容
- **SSE 服务**: 实时推送监控数据到前端
- **错误追踪**: 统一的错误处理和报告机制

### WebSocket 网关 (WebSocket Module)

- **双向代理**: 客户端与服务器之间的消息双向转发
- **连接管理**: 自动重连和优雅关闭
- **消息广播**: 支持消息广播和统计

## 配置说明

### 环境变量

```bash
TARGET_SERVER_URL=http://localhost:3000  # 目标服务器 URL
PORT=3000                               # 服务端口
```

### 代理配置

代理服务支持以下配置：
- 超时时间: 120 秒
- 最大连接数: Infinity
- 最大空闲连接: 0
- 禁用连接复用 (避免 socket hang up)

## API 文档

### 代理端点

所有 HTTP 请求都会被代理到目标服务器：

```
GET /api/*     -> 代理到目标服务器
POST /api/*    -> 代理到目标服务器
PUT /api/*     -> 代理到目标服务器
DELETE /api/*  -> 代理到目标服务器
```

### 监控端点

```bash
GET  /metrics          # 获取性能指标
GET  /inspect/sse      # SSE 实时监控流
GET  /inspect/logs     # 获取请求日志
```

### WebSocket 连接

```bash
ws://localhost:3000/ws  # WebSocket 网关连接
```

## 开发指南

### 代码规范

```bash
# ESLint 检查并修复
npm run lint

# Prettier 格式化
npm run format
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:cov

# E2E 测试
npm run test:e2e
```

## 监控仪表盘

访问 `http://localhost:3000/fusion` 查看实时监控仪表盘，包括：

- 请求统计和性能指标
- 实时日志流
- WebSocket 连接状态
- 系统资源使用情况

## 构建和部署

### 构建流程

1. 编译 TypeScript 代码
2. 注入版本信息
3. 复制静态资源
4. 输出到 `dist/` 目录

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。