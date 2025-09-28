class SSEMessageList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activeMessageRef = null; // 当前激活的消息引用

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
            // 使用防抖优化，避免频繁触发
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateMessageCount();
            }, 100);
        });
    }

    /**
     * 添加消息到列表
     * @param {string} type 消息类型
     * @param {string|object} content 消息内容
     */
    addMessage(type, content) {
        const container = this.shadowRoot.querySelector('#messages-container');

        // 清除占位消息
        const placeholder = container.querySelector('.message .message-time');
        if (placeholder && placeholder.textContent.includes('消息已清空')) {
            container.innerHTML = '';
        }

        // 创建新的消息元素
        const messageEl = document.createElement('sse-message');
        messageEl.setMessage(type, content);

        // 限制消息数量
        const messages = container.querySelectorAll('sse-message');
        if (messages.length >= 200) {
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
        const messages = container.querySelectorAll('sse-message');
        const firstVisibleIndex = this.getFirstVisibleMessageIndex();

        // 触发自定义事件通知消息数量变化
        this.dispatchEvent(new CustomEvent('message-count-changed', {
            bubbles: true,
            composed: true,
            detail: {
                total: messages.length,
                firstVisible: firstVisibleIndex,
                hasMessages: messages.length > 0
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

        if (messages.length === 0) return 0;

        // 计算滚动位置
        const containerTop = container.getBoundingClientRect().top;

        // 找到第一个完全或部分可见的消息
        for (let i = 0; i < messages.length; i++) {
            const messageTop = messages[i].getBoundingClientRect().top;
            const messageBottom = messages[i].getBoundingClientRect().bottom;
            const containerBottom = container.getBoundingClientRect().bottom;

            // 如果消息在可视区域内
            if (messageBottom >= containerTop && messageTop <= containerBottom) {
                return i + 1; // 从1开始计数
            }
        }

        return messages.length; // 如果都不在可视区域内，返回最后一个
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