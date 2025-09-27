class SSEClient extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.eventSource = null;
        this.messages = [];
        this.lastHeartbeatTime = 0;
        this.heartbeatCheckInterval = null;
        this.activeMessageRef = null; // 当前激活的消息引用

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
                    transition: transform 0.2s, box-shadow 0.2s;
                    height: 100%;
                    max-height: 100%;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .sse-container:hover {
                    /* 移除上移动画 */
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

                .messages-container {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 10px;
                    background-color: rgba(0, 0, 0, 0.2);
                    /* 确保容器不会超出父容器 */
                    height: 100%;
                    max-height: 100%;
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

                <div id="messages-container" class="messages-container">
                    <div class="message">
                        <div class="message-time">等待连接...</div>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.querySelector('#connect-btn').addEventListener('click', () => this.connect());
        this.shadowRoot.querySelector('#disconnect-btn').addEventListener('click', () => this.disconnect());
        this.shadowRoot.querySelector('#clear-btn').addEventListener('click', () => this.clearMessages());

        // 监听消息激活事件
        this.addEventListener('message-activated', (e) => {
            this.switchActiveMessage(e.detail.messageElement);
        });

        // 移除窗口大小监听器，使用 CSS flex 布局自动调整

        // 获取默认端点
        this.endpoint = this.getAttribute('endpoint') || '/inspect/sse';
    }

    connect() {
        if (this.eventSource) {
            this.addMessage('系统', '已经连接，请先断开');
            return;
        }

        try {
            this.eventSource = new EventSource(this.endpoint);
            this.updateStatus('connected', '已连接');

            this.eventSource.onopen = () => {
                this.addMessage('系统', 'SSE 连接已建立');
                this.shadowRoot.querySelector('#connect-btn').disabled = true;
                this.shadowRoot.querySelector('#disconnect-btn').disabled = false;

                // 开始心跳检测
                this.startHeartbeatCheck();
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // 处理心跳消息
                    if (data.type === 'heartbeat') {
                        this.lastHeartbeatTime = Date.now();
                        this.triggerHeartbeat();
                        return;
                    }
                    this.addMessage('服务器', data);
                } catch (e) {
                    this.addMessage('服务器', event.data);
                }
            };

            this.eventSource.onerror = (error) => {
                this.addMessage('错误', `连接错误 (readyState: ${this.eventSource.readyState})`);
                this.updateStatus('disconnected', '连接错误');
                this.disconnect();
            };

        } catch (error) {
            this.addMessage('错误', `连接失败: ${error.message}`);
            this.updateStatus('disconnected', '连接失败');
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.updateStatus('disconnected', '已断开');
            this.addMessage('系统', 'SSE 连接已断开');
            this.shadowRoot.querySelector('#connect-btn').disabled = false;
            this.shadowRoot.querySelector('#disconnect-btn').disabled = true;

            // 停止心跳检测
            this.stopHeartbeatCheck();
        }
    }

    addMessage(type, content) {
        const container = this.shadowRoot.querySelector('#messages-container');

        // 清除占位消息
        const placeholder = container.querySelector('.message .message-time');
        if (placeholder && (placeholder.textContent.includes('等待连接') || placeholder.textContent.includes('消息已清空'))) {
            container.innerHTML = '';
        }

        // 创建新的消息元素
        const messageEl = document.createElement('sse-message');
        messageEl.setMessage(type, content);

        // 限制消息数量
        const messages = container.querySelectorAll('sse-message');
        if (messages.length >= 50) {
            const removedMessage = messages[0];
            // 如果移除的是激活的消息，重置激活状态
            if (this.activeMessageRef === removedMessage) {
                this.activeMessageRef.setActive(false);
                this.activeMessageRef = null;
            }
            removedMessage.remove();
        }

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
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

    adjustMessagesContainerHeight() {
        // 使用 CSS flex 布局，不需要手动计算高度
        // flex: 1 和 min-height: 0 已经确保容器不会超出父容器
        // 这个方法保留用于可能的 future 调整
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

    startHeartbeatCheck() {
        // 每 15 秒检查一次心跳（服务器每 10 秒发一次）
        this.heartbeatCheckInterval = setInterval(() => {
            const now = Date.now();

            // 检查 EventSource 状态
            if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
                this.addMessage('错误', 'EventSource 已关闭');
                this.updateStatus('disconnected', '连接已关闭');
                this.disconnect();
                return;
            }

            // 如果超过 20 秒没有收到心跳，认为连接已断开
            if (now - this.lastHeartbeatTime > 20000) {
                this.addMessage('错误', '心跳超时，连接可能已断开');
                this.updateStatus('disconnected', '连接超时');
                this.disconnect();
            }
        }, 15000);
    }

    stopHeartbeatCheck() {
        if (this.heartbeatCheckInterval) {
            clearInterval(this.heartbeatCheckInterval);
            this.heartbeatCheckInterval = null;
        }
    }

  clearMessages() {
        const container = this.shadowRoot.querySelector('#messages-container');
        container.innerHTML = '<div class="message"><div class="message-time">消息已清空</div></div>';

        // 清空消息时重置激活状态
        if (this.activeMessageRef) {
            this.activeMessageRef.setActive(false);
            this.activeMessageRef = null;
        }
    }

    disconnectedCallback() {
        this.disconnect();
    }

    /**
     * 切换激活消息
     * @param {SSEMessage} newMessage 新的激活消息
     */
    switchActiveMessage(newMessage) {
        // 如果有之前激活的消息，取消其激活状态
        if (this.activeMessageRef && this.activeMessageRef !== newMessage) {
            this.activeMessageRef.setActive(false);
        }

        // 设置新的激活消息
        this.activeMessageRef = newMessage;
        newMessage.setActive(true);
    }
}

customElements.define('sse-client', SSEClient);