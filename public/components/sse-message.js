class SSEMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .message {
                    margin-bottom: 10px;
                    padding: 8px;
                    background-color: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 13px;
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
                }

                .message-data {
                    background-color: rgba(0, 0, 0, 0.3);
                    padding: 8px;
                    border-radius: 4px;
                    margin-top: 4px;
                    font-size: 12px;
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
            </style>
            <div class="message">
                <div class="message-time"></div>
                <div class="message-content"></div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    /**
     * 设置消息内容
     * @param {string} type 消息类型
     * @param {string|object} content 消息内容
     * @param {string} [time] 可选的时间戳，如果不提供则使用当前时间
     */
    setMessage(type, content, time) {
        const timeEl = this.shadowRoot.querySelector('.message-time');
        const contentEl = this.shadowRoot.querySelector('.message-content');
        const messageEl = this.shadowRoot.querySelector('.message');

        const timestamp = time || new Date().toLocaleTimeString();
        let contentHtml = '';
        let messageClass = '';

        if (typeof content === 'object') {
            // 为不同类型的消息添加样式
            if (content.icon) {
                messageClass = ` message-${content.type}`;
                contentHtml = `
                    <div class="message-header">
                        <span class="message-icon">${content.icon}</span>
                        <span class="message-text">${this.escapeHtml(content.message)}</span>
                    </div>
                    ${content.data ? `<pre class="message-data">${JSON.stringify(content.data, null, 2)}</pre>` : ''}
                `;
            } else {
                contentHtml = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
            }
        } else {
            contentHtml = this.escapeHtml(content);
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
}

customElements.define('sse-message', SSEMessage);