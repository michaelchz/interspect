class SSEClient extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.connection = null;
        this.countdownInterval = null;
        this.reconnectEndTime = null;
        this.messageCount = 0;
        this.firstVisibleIndex = 0;
        this.ignoredPaths = this.loadIgnoredPaths();

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
                    justify-content: flex-start;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .filter-controls {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                    flex-shrink: 0;
                    min-width: auto;
                }

                .filter-label {
                    font-size: 12px;
                    color: var(--text-color);
                    opacity: 0.8;
                    margin-right: 5px;
                }

                .filter-radio-group {
                    display: flex;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .filter-radio-wrapper {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    position: relative;
                    border-right: 1px solid var(--border-color);
                    flex-shrink: 0;
                    min-width: auto;
                }

                .filter-radio-wrapper:last-child {
                    border-right: none;
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
                    transition: all 0.2s ease;
                    background-color: rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    display: block;
                    text-align: center;
                    width: auto;
                    min-width: 28px;
                    max-width: 36px;
                    flex-shrink: 0;
                    white-space: nowrap;
                }

                .filter-radio:checked + .filter-radio-label {
                    opacity: 1;
                    background-color: var(--primary-color);
                    color: white;
                }

                .filter-radio-wrapper:hover .filter-radio-label {
                    opacity: 1;
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .filter-text-input {
                    position: relative;
                }

                .filter-text-input input {
                    padding: 6px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    font-size: 12px;
                    width: 200px;
                    min-width: 160px;
                    max-width: 280px;
                    transition: all 0.3s ease;
                    height: 32px;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }

                .filter-text-input input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .filter-text-input input::placeholder {
                    color: rgba(255, 255, 255, 0.4);
                }

                .clear-text-btn {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 16px;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                    display: none;
                }

                .clear-text-btn:hover {
                    color: rgba(255, 255, 255, 0.8);
                    background-color: rgba(255, 255, 255, 0.1);
                }

                /* 当输入框有内容时显示清除按钮 */
                .filter-text-input input:not(:placeholder-shown) + .clear-text-btn {
                    display: block;
                }

                .connection-status .status-text {
                    flex: 1;
                }

                .btn-clear {
                    padding: 4px 14px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    transition: all 0.2s ease;
                    height: 32px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                .connection-status {
                    padding: 4px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    transition: all 0.2s ease;
                    height: 32px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    position: relative;
                    padding-left: 24px;
                }

                .connection-status .info-icon {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    opacity: 0;
                    transition: all 0.2s ease;
                    cursor: help;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                }

                .connection-status.has-info .info-icon {
                    opacity: 0.8;
                    background-color: transparent;
                    color: var(--primary-color);
                    border: 1px solid var(--primary-color);
                }

                .connection-status.has-info .info-icon:hover {
                    opacity: 1;
                    transform: scale(1.1);
                }

                /* 移动端触摸优化 */
                @media (hover: none) and (pointer: coarse) {
                    .filter-radio-label:active,
                    .btn-clear:active,
                    .btn-ignore-path:active,
                    .auto-scroll-status:active,
                    .connection-status:active {
                        transform: scale(0.95);
                        opacity: 0.8;
                    }

                    .filter-text-input input:focus {
                        transform: scale(1.02);
                    }

                    .clear-text-btn:active {
                        transform: translateY(-50%) scale(0.9);
                    }
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                    min-width: 300px;
                    margin-left: auto;
                }

                .auto-scroll-status {
                    padding: 4px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    transition: all 0.2s ease;
                    height: 32px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                }

                .auto-scroll-status:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .auto-scroll-status.active {
                    background-color: rgba(76, 175, 80, 0.2);
                    color: #4caf50;
                    border-color: rgba(76, 175, 80, 0.3);
                }

                .auto-scroll-status.paused {
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    border-color: var(--border-color);
                }

                .auto-scroll-status .status-icon::before {
                    content: '🟢';
                }

                .auto-scroll-status.paused .status-icon::before {
                    content: '⚪';
                }

                .heartbeat-indicator {
                    width: 8px;
                    height: 8px;
                    background-color: #4caf50;
                    border-radius: 50%;
                    opacity: 0.4;
                    transition: all 0.3s ease;
                    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
                    position: absolute;
                    left: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .heartbeat-indicator.beat {
                    opacity: 1;
                    animation: heartbeat 0.6s ease;
                    box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.3);
                }

                @keyframes heartbeat {
                    0% {
                        transform: translateY(-50%) scale(1);
                        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
                    }
                    50% {
                        transform: translateY(-50%) scale(1.5);
                        box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.4);
                    }
                    100% {
                        transform: translateY(-50%) scale(1);
                        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
                    }
                }

                .title-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                    min-width: 80px;
                }

                .sse-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--secondary-color);
                }

                .connection-status.connected {
                    background-color: rgba(76, 175, 80, 0.2);
                    color: #4caf50;
                    border-color: rgba(76, 175, 80, 0.3);
                }

                .connection-status.disconnected {
                    background-color: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                    border-color: rgba(244, 67, 54, 0.3);
                }


                .btn-clear:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary-color);
                    transform: translateY(-1px);
                }
                .btn-ignore-path {
                    padding: 4px 14px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    background-color: rgba(255, 152, 0, 0.1);
                    color: var(--text-color);
                    transition: all 0.2s ease;
                    height: 32px;
                    box-sizing: border-box;
                    width: auto;
                    min-width: auto;
                    flex-shrink: 0;
                    white-space: nowrap;
                }
                .btn-ignore-path:hover {
                    background-color: rgba(255, 152, 0, 0.2);
                    border-color: #ff9800;
                    transform: translateY(-1px);
                }
                .ignore-path-count {
                    margin-left: 4px;
                    font-size: 11px;
                    opacity: 0.8;
                }

                #messages-container-wrapper {
                    flex: 1;
                    min-height: 0;
                }

                @media (max-width: 480px) {
                    .sse-header {
                        padding-bottom: 20px;
                        align-items: flex-start;
                    }

                    #messages-container-wrapper {
                        min-height: 300px;
                        height: 60vh;
                    }

                    .filter-controls {
                        order: 4;
                        justify-content: flex-start;
                        flex-basis: 100%;
                        flex-wrap: wrap;
                    }

                    .filter-text-input {
                        flex-basis: 100%;
                        order: 1;
                    }

                    .header-right {
                        order: 3;
                        flex-wrap: wrap;
                        gap: 6px;
                        justify-content: space-between;
                        flex-basis: 100%;
                    }

                    .header-right > * {
                        flex: 1;
                        min-width: 0;
                        text-align: center;
                    }

                    .connection-status {
                        order: 1;
                    }

                    .auto-scroll-status {
                        order: 2;
                    }

                    .btn-clear {
                        order: 3;
                    }
                }

            </style>
            <div class="sse-container">
                <div class="sse-header">
                    <div class="title-container">
                        <div class="sse-title">实时消息流</div>
                    </div>
                    <div class="filter-controls">
                        <div class="filter-radio-group">
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-all" name="message-filter" value="all" class="filter-radio" checked>
                                <label for="filter-all" class="filter-radio-label">ALL</label>
                            </div>
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-http" name="message-filter" value="http" class="filter-radio">
                                <label for="filter-http" class="filter-radio-label">HTTP</label>
                            </div>
                            <div class="filter-radio-wrapper">
                                <input type="radio" id="filter-websocket" name="message-filter" value="websocket" class="filter-radio">
                                <label for="filter-websocket" class="filter-radio-label">WS</label>
                            </div>
                        </div>
                        <div class="filter-text-input">
                            <input type="text" id="filter-text" placeholder="搜索消息内容..." />
                            <span class="clear-text-btn" id="clear-text-btn" title="清除文本">×</span>
                        </div>
                        <button id="ignore-path-btn" class="btn-ignore-path" title="忽略路径">
                            忽略路径
                            <span id="ignore-path-count" class="ignore-path-count">(0)</span>
                        </button>
                    </div>
                    <div class="header-right">
                        <button id="clear-btn" class="btn-clear">清空消息</button>
                        <div class="auto-scroll-status" id="auto-scroll-status" title="🟢 自动滚动 / ⚪ 停止滚动">
                            <span class="status-icon"></span>
                            <span class="status-text">自动滚动</span>
                        </div>
                        <div id="connection-status" class="connection-status disconnected">
                            <span class="status-text">未连接</span>
                            <span class="info-icon"></span>
                            <div id="heartbeat-indicator" class="heartbeat-indicator"></div>
                        </div>
                    </div>
                </div>

                <div id="messages-container-wrapper">
                    <sse-message-list id="message-list"></sse-message-list>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.querySelector('#ignore-path-btn').addEventListener('click', () => this.showIgnorePathModal());
        this.shadowRoot.querySelector('#clear-btn').addEventListener('click', () => this.clearMessages());

        // 绑定过滤器事件
        this.shadowRoot.querySelectorAll('.filter-radio').forEach(radio => {
            radio.addEventListener('change', () => this.handleFilterChange());
        });

        // 绑定文本过滤输入事件（使用防抖）
        const filterTextInput = this.shadowRoot.querySelector('#filter-text');
        const clearTextBtn = this.shadowRoot.querySelector('#clear-text-btn');
        const debouncedFilterChange = this.debounce(() => this.handleFilterChange(), 300);

        filterTextInput.addEventListener('input', debouncedFilterChange);

        // 绑定清除按钮点击事件
        clearTextBtn.addEventListener('click', () => {
            filterTextInput.value = '';
            filterTextInput.dispatchEvent(new Event('input'));
            filterTextInput.focus();
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
        this.endpoint = this.getAttribute('endpoint') || '/interspect/sse';
    }

    /**
     * 创建防抖函数
     * @param {Function} fn 要执行的函数
     * @param {number} delay 延迟时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * 获取消息列表组件
     * @returns {SSEMessageList} 消息列表组件
     */
    getMessageList() {
        return this.shadowRoot.querySelector('#message-list');
    }

    /**
     * 获取当前过滤条件
     * @returns {object} 过滤条件: { type: 'all/http/websocket', text: string, ignoredPaths: array }
     */
    getCurrentFilter() {
        const checkedRadio = this.shadowRoot.querySelector('.filter-radio:checked');
        const filterTextInput = this.shadowRoot.querySelector('#filter-text');
        return {
            type: checkedRadio ? checkedRadio.value : 'all',
            text: filterTextInput ? filterTextInput.value.trim().toLowerCase() : '',
            ignoredPaths: [...this.ignoredPaths] // 返回数组副本
        };
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
        // 初始化忽略路径
        this.ignoredPaths = this.loadIgnoredPaths();

        // 更新按钮上的数量显示
        this.updateIgnorePathCount();

        // 应用初始的忽略路径过滤
        if (this.ignoredPaths.length > 0) {
                    // 延迟执行确保消息列表组件已加载
                    requestAnimationFrame(() => {
                        this.handleFilterChange();
                    });
        }

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
        requestAnimationFrame(() => {
            if (this.connection) {
                this.connection.connect();
            }
        });
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
        const statusTextEl = statusEl.querySelector('.status-text');
        if (statusTextEl) {
            statusTextEl.textContent = text;
        }

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
            const statusText = autoScrollStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = isActive ? '自动滚动' : '停止滚动';
            }
        }
    }

    /**
     * 更新状态文本
     */
    updateStatusText(text, isError = false) {
        const connectionStatusEl = this.shadowRoot.querySelector('#connection-status');
        if (!connectionStatusEl) return;

        const statusTextEl = connectionStatusEl.querySelector('.status-text');
        const infoIconEl = connectionStatusEl.querySelector('.info-icon');
        if (!statusTextEl || !infoIconEl) return;

        // 保存原始状态文本
        const originalText = statusTextEl.dataset.originalText || statusTextEl.textContent;
        statusTextEl.dataset.originalText = originalText;

        // 获取消息内容
        const message = typeof text === 'string' ? text : text?.message || '';

        if (message) {
            // 显示信息图标
            connectionStatusEl.classList.add('has-info');
            infoIconEl.textContent = '!';
            statusTextEl.dataset.fullText = `${originalText}：${message}`;

            // 设置颜色
            const color = isError ? '#f44336' : '#2196F3';
            connectionStatusEl.style.color = color;
            infoIconEl.style.color = color;
            infoIconEl.style.borderColor = color;

            // 添加悬停事件（只添加一次）
            if (!connectionStatusEl.dataset.hasHoverListener) {
                connectionStatusEl.dataset.hasHoverListener = 'true';
                connectionStatusEl.addEventListener('mouseenter', this.handleStatusHover.bind(this, statusTextEl, infoIconEl));
                connectionStatusEl.addEventListener('mouseleave', this.handleStatusLeave.bind(this, statusTextEl, infoIconEl));
            }
        } else {
            // 隐藏信息图标
            connectionStatusEl.classList.remove('has-info');
            statusTextEl.textContent = originalText;
            connectionStatusEl.style.color = '';
        }
    }

    /**
     * 处理状态悬停
     */
    handleStatusHover(statusTextEl, infoIconEl) {
        if (statusTextEl.dataset.fullText) {
            statusTextEl.textContent = statusTextEl.dataset.fullText;
            infoIconEl.style.display = 'none';
        }
    }

    /**
     * 处理状态离开
     */
    handleStatusLeave(statusTextEl, infoIconEl) {
        if (statusTextEl.dataset.originalText) {
            statusTextEl.textContent = statusTextEl.dataset.originalText;
            infoIconEl.style.display = '';
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
                const statusTextEl = statusEl.querySelector('.status-text');
                if (statusTextEl) {
                    statusTextEl.textContent = text;
                }
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

    updateIgnorePathCount() {
        const countElement = this.shadowRoot.querySelector('#ignore-path-count');
        if (countElement) {
            countElement.textContent = `(${this.ignoredPaths.length})`;
        }
    }

    showIgnorePathModal() {
        // 创建弹窗元素
        let modal = document.querySelector('path-input-modal');
        if (!modal) {
            modal = document.createElement('path-input-modal');
            document.body.appendChild(modal);
        }

        // 设置回调函数
        modal.onAddPath = (path) => {
            if (!this.ignoredPaths.includes(path)) {
                this.ignoredPaths.push(path);
                modal.updatePathList(this.ignoredPaths);
                this.updateIgnorePathCount();
            }
        };

        modal.onRemovePath = (index) => {
            this.ignoredPaths.splice(index, 1);
            modal.updatePathList(this.ignoredPaths);
            this.updateIgnorePathCount();
        };

        modal.onConfirm = () => {
            // 保存所有更改并应用过滤
            this.saveIgnoredPaths();
            this.applyPathFilter();
        };

        // 显示弹窗
        modal.show(this.ignoredPaths);
    }

    loadIgnoredPaths() {
        try {
            const saved = localStorage.getItem('interspect-ignored-paths');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load ignored paths:', e);
            return [];
        }
    }

    saveIgnoredPaths() {
        try {
            localStorage.setItem('interspect-ignored-paths', JSON.stringify(this.ignoredPaths));
        } catch (e) {
            console.warn('Failed to save ignored paths:', e);
        }
    }

    applyPathFilter() {
        // 触发过滤器更新，ignoredPaths 已经包含在 getCurrentFilter 中
        this.handleFilterChange();
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