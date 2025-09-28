class SSEMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.messageData = null;
        this.isActive = false;

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .message {
                    margin-bottom: 8px;
                    padding: 6px 8px;
                    background-color: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    position: relative;
                }

                .message:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .message-time {
                    color: #888;
                    font-size: 11px;
                }

                .message-content {
                    margin-top: 4px;
                    color: #fff;
                }

                .message-content pre {
                    margin: 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: monospace;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .message-icon {
                    font-size: 16px;
                }

                .message-text {
                    font-weight: 500;
                    /* 确保消息文本换行 */
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .message-data {
                    margin-top: 4px;
                    font-size: 12px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }

                .message-request .message-icon {
                    color: #2196F3;
                }

                .message-response .message-icon {
                    color: #4CAF50;
                }

                .message-error .message-icon {
                    color: #F44336;
                }

                /* 激活状态样式 */
                .message.active {
                    border-left: 3px solid #2196F3;
                    background-color: rgba(33, 150, 243, 0.1);
                }

                .message.active::before {
                    content: '👁';
                    position: absolute;
                    right: 8px;
                    top: 8px;
                    font-size: 12px;
                    opacity: 0.6;
                }
            </style>
            <div class="message">
                <div class="message-time"></div>
                <div class="message-content"></div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 添加点击事件
        this.shadowRoot.querySelector('.message').addEventListener('click', (e) => {
            // 检查是否有文本被选中
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                // 如果有文本选中，不打开弹窗
                return;
            }

            // 如果没有文本选中，才显示弹窗
            this.showMessageModal();
        });
    }

    /**
     * 设置消息内容
     * @param {string} type 消息类型
     * @param {string|object} content 消息内容
     * @param {string} [time] 可选的时间戳，如果不提供则使用当前时间
     */
    setMessage(type, content, time) {
        // 保存消息数据用于弹窗
        this.messageData = { type, content, time };
        const timeEl = this.shadowRoot.querySelector('.message-time');
        const contentEl = this.shadowRoot.querySelector('.message-content');
        const messageEl = this.shadowRoot.querySelector('.message');

        const timestamp = time || new Date().toLocaleTimeString();
        let contentHtml = '';
        let messageClass = '';

        if (typeof content === 'object' && content.icon) {
            // 只显示图标和消息概要，不显示详细数据
            messageClass = ` message-${content.type}`;
            let sizeInfo = '';

            // 提取 content-length
            if (content.data && content.data.headers && content.data.headers['content-length']) {
                sizeInfo = ` (${content.data.headers['content-length']} bytes)`;
            } else if (content.data && content.data.data) {
                // WebSocket 消息
                sizeInfo = ` (${content.data.data.length} bytes)`;
            } else if (content.data && content.data.body) {
                // 请求/响应消息
                sizeInfo = ` (${content.data.body.length} bytes)`;
            }

            contentHtml = `
                <div class="message-header">
                    <span class="message-icon">${content.icon}</span>
                    <span class="message-text">${this.escapeHtml(content.message)}${sizeInfo}</span>
                </div>
            `;
        } else if (typeof content === 'object') {
            // 其他对象类型，显示类型提示
            contentHtml = '<div style="color: #888;">[对象消息]</div>';
        } else {
            // 文本消息，截取前 50 个字符
            const text = this.escapeHtml(content);
            const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
            contentHtml = shortText;
        }

        messageEl.className = `message${messageClass}`;
        timeEl.textContent = `[${timestamp}] ${type}:`;
        contentEl.innerHTML = contentHtml;
    }

    /**
     * HTML 转义，防止 XSS
     * @param {string} text 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 设置消息的激活状态
     * @param {boolean} active 是否激活
     */
    setActive(active) {
        this.isActive = active;
        const messageEl = this.shadowRoot.querySelector('.message');
        if (active) {
            messageEl.classList.add('active');
        } else {
            messageEl.classList.remove('active');
        }
    }

    /**
     * 显示消息弹窗
     */
    showMessageModal() {
        if (!this.messageData) return;

        // 触发消息激活事件，通知 SSEClient 切换激活状态
        this.dispatchEvent(new CustomEvent('message-activated', {
            bubbles: true,
            composed: true,
            detail: { messageElement: this }
        }));

        // 创建或获取弹窗组件
        let modal = document.querySelector('message-modal');
        if (!modal) {
            modal = document.createElement('message-modal');
            document.body.appendChild(modal);
        }

        // 显示弹窗
        modal.show(this.messageData.type, this.messageData.content, this.messageData.time);
    }
}

customElements.define('sse-message', SSEMessage);