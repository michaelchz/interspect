class SSEMessageList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activeMessageRef = null; // 当前激活的消息引用
        this.currentFilter = 'all'; // 当前过滤条件: all/http/websocket
        this.autoScroll = true; // 是否自动滚动
        this.onAutoScrollChange = null; // 自动滚动状态变化回调

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                }

                .messages-container {
                    height: calc(100% - 15px);
                    min-height: 0;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 8px;
                    background-color: rgba(0, 0, 0, 0.2);
                }

                /* 滚动条样式 */
                .messages-container::-webkit-scrollbar {
                    width: 8px;
                }

                .messages-container::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }

                .messages-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }

                .messages-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            </style>
            <div id="messages-container" class="messages-container">
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 监听消息激活事件
        this.addEventListener('message-activated', (e) => {
            this.switchActiveMessage(e.detail.messageElement);
        });

        // 监听滚动事件
        const container = this.shadowRoot.querySelector('#messages-container');
        container.addEventListener('scroll', () => {
            // 清除之前的定时器
            clearTimeout(this.scrollTimeout);

            // 检查是否在底部，确定是否自动滚动
            this.setAutoScroll(this.isAtBottom());

            // 使用防抖优化，避免频繁触发
            this.scrollTimeout = setTimeout(() => {
                this.updateMessageCount();
            }, 100);
        });
    }

    /**
     * 设置过滤条件
     * @param {string} filter 过滤条件: all/http/websocket
     */
    setFilter(filter) {
        if (this.currentFilter !== filter) {
            this.currentFilter = filter;
            this.applyFilter();
        }
    }

    
    /**
     * 判断消息是否应该显示
     * @param {string} messageType 消息类型
     * @returns {boolean} 是否应该显示
     */
    shouldShowMessage(messageType) {
        if (this.currentFilter === 'all') {
            return true;
        }
        return messageType === this.currentFilter;
    }

    /**
     * 应用过滤条件
     */
    applyFilter() {
        const container = this.shadowRoot.querySelector('#messages-container');
        const messages = container.querySelectorAll('sse-message');

        messages.forEach(messageEl => {
            const messageType = messageEl.messageType || 'other';
            if (this.shouldShowMessage(messageType)) {
                messageEl.style.display = 'block';
            } else {
                messageEl.style.display = 'none';
            }
        });

        // 更新消息计数
        this.updateMessageCount();
    }

    /**
     * 检查是否滚动到底部
     * @returns {boolean} 是否在底部
     */
    isAtBottom() {
        const container = this.shadowRoot.querySelector('#messages-container');
        const threshold = 50; // 距离底部 50px 内算作底部
        return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const container = this.shadowRoot.querySelector('#messages-container');
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 设置自动滚动状态
     * @param {boolean} enabled 是否启用自动滚动
     */
    setAutoScroll(enabled) {
        if (this.autoScroll !== enabled) {
            this.autoScroll = enabled;
            // 调用回调函数
            if (this.onAutoScrollChange && typeof this.onAutoScrollChange === 'function') {
                this.onAutoScrollChange(enabled);
            }
        }
    }

    /**
     * 添加消息到列表
     * @param {object} content 消息内容（包含 entryType 等字段）
     */
    addMessage(content) {
        const container = this.shadowRoot.querySelector('#messages-container');

        // 清除占位消息
        const placeholder = container.querySelector('.message .message-time');
        if (placeholder && placeholder.textContent.includes('消息已清空')) {
            container.innerHTML = '';
        }

        // 从 content 中获取 entryType 并映射到过滤类型
        let filterType = 'other';
        if (content && content.data && content.data.entryType) {
            switch (content.data.entryType) {
                case 'request':
                case 'response':
                    filterType = 'http';
                    break;
                case 'websocket':
                    filterType = 'websocket';
                    break;
                case 'error':
                    filterType = 'error';
                    break;
                default:
                    filterType = 'other';
            }
        }

        // 检查是否应该显示此消息
        if (!this.shouldShowMessage(filterType)) {
            // 虽然不显示，但仍计入总数以便统计
            this.updateMessageCount();
            return;
        }

        // 创建新的消息元素
        const messageEl = document.createElement('sse-message');
        messageEl.setMessage(content);
        // 保存消息类型供过滤使用
        messageEl.messageType = filterType;

        // 限制消息数量
        const allMessages = container.querySelectorAll('sse-message');
        if (allMessages.length >= 200) {
            // 找到第一条消息并移除（不管是可见还是隐藏）
            const firstMessage = allMessages[0];
            if (this.activeMessageRef === firstMessage) {
                this.activeMessageRef.setActive(false);
                this.activeMessageRef = null;
            }
            firstMessage.remove();
        }

        container.appendChild(messageEl);

        // 根据自动滚动状态决定是否滚动
        if (this.autoScroll) {
            container.scrollTop = container.scrollHeight;
        }

        // 触发消息数量更新事件
        this.updateMessageCount();
    }

    /**
     * 清空所有消息
     */
    clearMessages() {
        const container = this.shadowRoot.querySelector('#messages-container');
        container.innerHTML = '<div class="message"><div class="message-time">消息已清空</div></div>';

        // 清空消息时重置激活状态
        if (this.activeMessageRef) {
            this.activeMessageRef.setActive(false);
            this.activeMessageRef = null;
        }

        // 触发消息数量更新事件
        this.updateMessageCount();
    }

    /**
     * 更新消息数量
     */
    updateMessageCount() {
        const container = this.shadowRoot.querySelector('#messages-container');
        const allMessages = container.querySelectorAll('sse-message');
        const visibleMessages = container.querySelectorAll('sse-message:not([style*="display: none"])');
        const firstVisibleIndex = this.getFirstVisibleMessageIndex();

        // 触发自定义事件通知消息数量变化
        this.dispatchEvent(new CustomEvent('message-count-changed', {
            bubbles: true,
            composed: true,
            detail: {
                total: allMessages.length,
                visible: visibleMessages.length,
                firstVisible: firstVisibleIndex,
                hasMessages: allMessages.length > 0
            }
        }));
    }

    /**
     * 获取当前窗口中第一条可见消息的序号
     * @returns {number} 第一条可见消息的序号（从1开始）
     */
    getFirstVisibleMessageIndex() {
        const container = this.shadowRoot.querySelector('#messages-container');
        const messages = container.querySelectorAll('sse-message');
        const containerRect = container.getBoundingClientRect();

        let visibleIndex = 0;

        for (const message of messages) {
            if (message.style.display === 'none') continue;

            visibleIndex++;
            const messageRect = message.getBoundingClientRect();

            // 检查消息是否在可视区域内
            if (messageRect.bottom >= containerRect.top &&
                messageRect.top <= containerRect.bottom) {
                return visibleIndex;
            }
        }

        return visibleIndex || 1;
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

customElements.define('sse-message-list', SSEMessageList);