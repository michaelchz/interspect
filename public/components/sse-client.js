class SSEClient extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.connection = null;
        this.countdownInterval = null;
        this.reconnectEndTime = null;

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                }
                .sse-container {
                    background-color: var(--card-bg);
                    border-radius: 8px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    transition: box-shadow 0.2s;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .sse-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-color);
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .heartbeat-indicator {
                    width: 8px;
                    height: 8px;
                    background-color: #4caf50;
                    border-radius: 50%;
                    opacity: 0.3;
                    transition: opacity 0.3s ease;
                }

                .heartbeat-indicator.beat {
                    opacity: 1;
                    animation: heartbeat 0.6s ease;
                }

                @keyframes heartbeat {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.5);
                    }
                    100% {
                        transform: scale(1);
                    }
                }

                .sse-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--secondary-color);
                }

                .connection-status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .connected {
                    background-color: #4caf50;
                    color: white;
                }

                .disconnected {
                    background-color: #f44336;
                    color: white;
                }

                .control-buttons {
                    margin-bottom: 15px;
                    display: flex;
                    gap: 10px;
                    justify-content: space-between;
                }

                .btn-group-left {
                    display: flex;
                    gap: 10px;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }

                .btn-primary {
                    background-color: var(--primary-color);
                    color: white;
                }

                .btn-primary:hover {
                    background-color: #45a049;
                }

                .btn-secondary {
                    background-color: #666;
                    color: white;
                }

                .btn-secondary:hover {
                    background-color: #555;
                }

                #messages-container-wrapper {
                    flex: 1;
                    min-height: 0;
                }

            </style>
            <div class="sse-container">
                <div class="sse-header">
                    <div class="sse-title">SSE 客户端</div>
                    <div class="header-right">
                        <div id="heartbeat-indicator" class="heartbeat-indicator"></div>
                        <div id="connection-status" class="connection-status disconnected">未连接</div>
                    </div>
                </div>

                <div class="control-buttons">
                    <div class="btn-group-left">
                        <button id="connect-btn" class="btn btn-primary">连接</button>
                        <button id="disconnect-btn" class="btn btn-secondary" disabled>断开</button>
                    </div>
                    <button id="clear-btn" class="btn btn-secondary">清空消息</button>
                </div>

                <div id="messages-container-wrapper">
                    <sse-message-list id="message-list"></sse-message-list>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.querySelector('#connect-btn').addEventListener('click', () => this.connect());
        this.shadowRoot.querySelector('#disconnect-btn').addEventListener('click', () => this.disconnect());
        this.shadowRoot.querySelector('#clear-btn').addEventListener('click', () => this.clearMessages());

  
        // 获取默认端点
        this.endpoint = this.getAttribute('endpoint') || '/inspect/sse';
    }

    /**
     * 获取消息列表组件
     * @returns {SSEMessageList} 消息列表组件
     */
    getMessageList() {
        return this.shadowRoot.querySelector('#message-list');
    }

    connectedCallback() {
        // 创建 SSE 连接实例
        this.connection = new SSEConnection({
            endpoint: this.endpoint,
            autoReconnect: true,
            maxReconnectAttempts: 5,
            onStatusChange: (status, info) => this.handleStatusChange(status, info),
            onMessage: (message) => this.handleMessage(message),
            onHeartbeat: (data) => this.handleHeartbeat(data),
            onError: (error) => this.handleError(error),
            onConnect: () => this.handleConnect(),
            onDisconnect: () => this.handleDisconnect()
        });

        // 延迟一点时间确保组件完全加载后自动连接
        setTimeout(() => {
            this.connect();
        }, 100);
    }

    connect() {
        if (this.connection) {
            this.connection.connect();
        }
    }

    disconnect() {
        if (this.connection) {
            this.connection.disconnect();
        }
    }

    addMessage(type, content) {
        const messageList = this.getMessageList();
        messageList.addMessage(type, content);
    }

    /**
     * 处理连接状态变化
     */
    handleStatusChange(status, info = null) {
        let text = '';
        switch (status) {
            case 'connecting':
                text = '连接中...';
                break;
            case 'connected':
                text = '已连接';
                break;
            case 'disconnected':
                text = '未连接';
                break;
            case 'reconnecting':
                if (info && info.delay) {
                    this.startCountdown(info.delay, info.attempt);
                    const seconds = Math.ceil(info.delay / 1000);
                    text = `重连中(${info.attempt})...${seconds}`;
                } else {
                    text = '重连中...';
                }
                break;
        }
        this.updateStatus(status === 'connected' ? 'connected' : 'disconnected', text);
    }

    /**
     * 处理接收到消息
     */
    handleMessage(message) {
        this.addMessage('服务器', message);
    }

    /**
     * 处理心跳消息
     */
    handleHeartbeat(data) {
        this.triggerHeartbeat();
    }

    /**
     * 处理连接错误
     */
    handleError(error) {
        this.addMessage('错误', `连接错误: ${error.message}`);
    }

    /**
     * 处理连接建立
     */
    handleConnect() {
        this.stopCountdown();
        this.addMessage('系统', 'SSE 连接已建立');
        this.shadowRoot.querySelector('#connect-btn').disabled = true;
        this.shadowRoot.querySelector('#disconnect-btn').disabled = false;
    }

    /**
     * 处理连接断开
     */
    handleDisconnect() {
        this.addMessage('系统', 'SSE 连接已断开');
        this.getMessageList().clearMessages();
        this.shadowRoot.querySelector('#connect-btn').disabled = false;
        this.shadowRoot.querySelector('#disconnect-btn').disabled = true;
    }

    updateStatus(status, text) {
        const statusEl = this.shadowRoot.querySelector('#connection-status');
        const indicator = this.shadowRoot.querySelector('#heartbeat-indicator');

        statusEl.className = `connection-status ${status}`;
        statusEl.textContent = text;

        // 根据连接状态显示/隐藏心跳指示器
        if (status === 'connected') {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    triggerHeartbeat() {
        const indicator = this.shadowRoot.querySelector('#heartbeat-indicator');
        indicator.classList.remove('beat');
        // 强制重绘
        void indicator.offsetWidth;
        indicator.classList.add('beat');

        // 600ms 后移除动画类
        setTimeout(() => {
            indicator.classList.remove('beat');
        }, 600);
    }

  
    clearMessages() {
        const messageList = this.getMessageList();
        messageList.clearMessages();
    }

    /**
     * 启动倒计时
     */
    startCountdown(delay, attempt) {
        this.stopCountdown();
        this.reconnectEndTime = Date.now() + delay;

        this.countdownInterval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((this.reconnectEndTime - Date.now()) / 1000));
            const text = `重连中(${attempt})...${remaining}`;

            const statusEl = this.shadowRoot.querySelector('#connection-status');
            if (statusEl) {
                statusEl.textContent = text;
            }

            // 倒计时结束
            if (remaining === 0) {
                this.stopCountdown();
            }
        }, 200);
    }

    /**
     * 停止倒计时
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.reconnectEndTime = null;
    }

    disconnectedCallback() {
        this.stopCountdown();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }

}

customElements.define('sse-client', SSEClient);