class SSEClient extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.connection = null;
        this.countdownInterval = null;
        this.reconnectEndTime = null;
        this.messageCount = 0;
        this.firstVisibleIndex = 0;

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

                .filter-controls {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .filter-label {
                    font-size: 12px;
                    color: var(--text-color);
                    opacity: 0.8;
                    margin-right: 5px;
                }

                .filter-radio-group {
                    display: flex;
                    gap: 12px;
                }

                .filter-radio-wrapper {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    position: relative;
                }

                .filter-radio {
                    opacity: 0;
                    position: absolute;
                    width: 0;
                    height: 0;
                }

                .filter-radio-label {
                    font-size: 12px;
                    color: var(--text-color);
                    opacity: 0.7;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .filter-radio:checked + .filter-radio-label {
                    opacity: 1;
                    background-color: rgba(106, 78, 255, 0.2);
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }

                .filter-radio-wrapper:hover .filter-radio-label {
                    opacity: 1;
                    background-color: rgba(106, 78, 255, 0.1);
                }

                .status-text {
                    font-size: 12px;
                    color: #666;
                    padding: 4px 8px;
                    background-color: #f5f5f5;
                    border-radius: 4px;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    transition: all 0.3s ease;
                }

                .status-text.system-message {
                    color: #2196F3;
                    background-color: #e3f2fd;
                }

                .status-text.error {
                    color: #f44336;
                    background-color: #ffebee;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .auto-scroll-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    font-size: 14px;
                    cursor: default;
                    transition: all 0.3s ease;
                }

                .auto-scroll-status.active {
                    background-color: rgba(76, 175, 80, 0.2);
                    color: #4CAF50;
                }

                .auto-scroll-status.paused {
                    background-color: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                }

                .auto-scroll-status .status-icon::before {
                    content: '▶';
                }

                .auto-scroll-status.paused .status-icon::before {
                    content: '❚❚';
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

                .title-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
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


                .btn-clear {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    background-color: #666;
                    color: white;
                    transition: background-color 0.2s;
                }

                .btn-clear:hover {
                    background-color: #555;
                }

                #messages-container-wrapper {
                    flex: 1;
                    min-height: 0;
                }

            </style>
            <div class="sse-container">
                <div class="sse-header">
                    <div class="title-container">
                        <div class="sse-title">实时消息流</div>
                        <div class="auto-scroll-status" id="auto-scroll-status" title="自动滚动状态">
                            <span class="status-icon"></span>
                        </div>
                    </div>
                    <div class="filter-controls">
                        <span class="filter-label">过滤:</span>
                        <div class="filter-radio-group">
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-all" name="message-filter" value="all" class="filter-radio" checked>
                                <label for="filter-all" class="filter-radio-label">全部</label>
                            </div>
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-http" name="message-filter" value="http" class="filter-radio">
                                <label for="filter-http" class="filter-radio-label">HTTP</label>
                            </div>
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-websocket" name="message-filter" value="websocket" class="filter-radio">
                                <label for="filter-websocket" class="filter-radio-label">WebSocket</label>
                            </div>
                        </div>
                    </div>
                    <div class="header-right">
                        <button id="clear-btn" class="btn-clear">清空消息</button>
                        <div id="status-text" class="status-text" title="状态信息"></div>
                        <div id="heartbeat-indicator" class="heartbeat-indicator"></div>
                        <div id="connection-status" class="connection-status disconnected">未连接</div>
                    </div>
                </div>

                <div id="messages-container-wrapper">
                    <sse-message-list id="message-list"></sse-message-list>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.querySelector('#clear-btn').addEventListener('click', () => this.clearMessages());

        // 绑定过滤器事件
        this.shadowRoot.querySelectorAll('.filter-radio').forEach(radio => {
            radio.addEventListener('change', () => this.handleFilterChange());
        });

        // 监听消息列表的数量变化
        const messageList = this.shadowRoot.querySelector('#message-list');
        if (messageList) {
            messageList.addEventListener('message-count-changed', (e) => {
                this.messageCount = e.detail.total;
                this.firstVisibleIndex = e.detail.firstVisible;
                this.updateClearButtonText(e.detail.visible);
            });

            // 设置自动滚动状态变化回调
            messageList.onAutoScrollChange = (isActive) => {
                this.updateAutoScrollStatus(isActive);
            };

            // 初始化状态显示
            this.updateAutoScrollStatus(messageList.autoScroll);
        }

  
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

    /**
     * 获取当前过滤值
     * @returns {string} 过滤值: all/http/websocket
     */
    getCurrentFilter() {
        const checkedRadio = this.shadowRoot.querySelector('.filter-radio:checked');
        return checkedRadio ? checkedRadio.value : 'all';
    }

    /**
     * 处理过滤器变化
     */
    handleFilterChange() {
        const filter = this.getCurrentFilter();
        const messageList = this.getMessageList();
        if (messageList) {
            messageList.setFilter(filter);
        }
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
            if (this.connection) {
                this.connection.connect();
            }
        }, 100);
    }

    addMessage(content) {
        const messageList = this.getMessageList();
        messageList.addMessage(content);
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
                    this.updateStatusText(`正在尝试第${info.attempt}次重连`);
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
        this.addMessage(message);
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
        this.updateStatusText(`连接错误: ${error.message}`, true);
    }

    /**
     * 处理连接建立
     */
    handleConnect() {
        this.stopCountdown();
        this.updateStatusText('SSE 连接已建立');
    }

    /**
     * 处理连接断开
     */
    handleDisconnect() {
        this.updateStatusText('SSE 连接已断开', true);
        this.getMessageList().clearMessages();
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
     * 更新清空按钮的文字
     */
    updateClearButtonText(visibleCount) {
        const clearBtn = this.shadowRoot.querySelector('#clear-btn');
        if (clearBtn && this.messageCount > 0) {
            const visible = visibleCount !== undefined ? visibleCount : this.messageCount;
            clearBtn.textContent = `清空消息 (${this.firstVisibleIndex}/${visible} | ${this.messageCount})`;
        } else {
            clearBtn.textContent = '清空消息';
        }
    }

    /**
     * 更新自动滚动状态显示
     * @param {boolean} isActive 是否启用自动滚动
     */
    updateAutoScrollStatus(isActive) {
        const autoScrollStatus = this.shadowRoot.querySelector('#auto-scroll-status');
        if (autoScrollStatus) {
            autoScrollStatus.className = `auto-scroll-status ${isActive ? 'active' : 'paused'}`;
        }
    }

    /**
     * 更新状态文本
     */
    updateStatusText(text, isError = false) {
        const statusTextEl = this.shadowRoot.querySelector('#status-text');
        if (statusTextEl) {
            statusTextEl.textContent = typeof text === 'string' ? text : text.message || text;
            statusTextEl.className = 'status-text';

            if (isError) {
                statusTextEl.classList.add('error');
            } else {
                statusTextEl.classList.add('system-message');
            }
        }
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