/**
 * SSE 连接组件 - 独立的连接管理器
 * 负责建立、维护和管理 SSE 连接
 */
class SSEConnection {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/interspect/sse';
    this.heartbeatInterval = options.heartbeatInterval || 15000; // 15秒
    this.heartbeatTimeout = options.heartbeatTimeout || 20000; // 20秒

    // 连接状态
    this.status = 'disconnected'; // disconnected, connecting, connected, reconnecting
    this.eventSource = null;
    this.lastHeartbeat = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.autoReconnect = options.autoReconnect !== false; // 默认自动重连

    // 回调函数
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onMessage = options.onMessage || (() => {});
    this.onHeartbeat = options.onHeartbeat || (() => {});
    this.onError = options.onError || (() => {});
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
  }

  /**
   * 连接到 SSE 服务器
   */
  connect() {
    if (this.status === 'connecting' || this.status === 'connected') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.eventSource = new EventSource(this.endpoint);

      this.eventSource.onopen = () => {
        this.setStatus('connected');
        this.lastHeartbeat = Date.now();
        this.reconnectAttempts = 0;
        this.startHeartbeatCheck();
        this.onConnect();
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = () => {
        this.handleError();
      };

    } catch (error) {
      this.onError(error);
      this.disconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.setStatus('disconnected');

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.stopHeartbeatCheck();
    this.stopReconnectTimer();
    this.onDisconnect();
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // 处理心跳消息
      if (data.type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
        this.onHeartbeat(data);
        return;
      }

      // 处理服务器关闭消息 - 触发重连
      if (data.type === 'shutdown') {
        this.handleHeartbeatTimeout();
        return;
      }

      // 直接调用消息回调，由外部处理消息队列
      this.onMessage(data);

    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }

  /**
   * 开始心跳检测
   */
  startHeartbeatCheck() {
    this.stopHeartbeatCheck();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;

      // 检查心跳超时
      if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
        this.handleHeartbeatTimeout();
      }
    }, this.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeatCheck() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 处理心跳超时
   */
  handleHeartbeatTimeout() {
    this.disconnect();

    // 尝试重连（仅在启用自动重连时）
    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      // 设置状态并传递延时时间
      this.setStatus('reconnecting', { delay, attempt: this.reconnectAttempts });

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError(new Error('Max reconnect attempts reached'));
    }
  }

  /**
   * 处理连接错误
   */
  handleError() {
    // 检查 EventSource 的状态
    if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
      // 服务器主动关闭连接，触发重连
      if (this.status !== 'disconnected') {
        this.handleHeartbeatTimeout();
      }
    } else if (this.status === 'connected') {
      // 其他连接错误也触发重连
      this.handleHeartbeatTimeout();
    }
  }

  /**
   * 停止重连定时器
   */
  stopReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 设置连接状态
   */
  setStatus(status, info = null) {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChange(status, info);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      status: this.status,
      connected: this.status === 'connected',
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.disconnect();
  }
}

// 导出类
window.SSEConnection = SSEConnection;