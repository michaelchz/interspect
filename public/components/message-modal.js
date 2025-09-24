class MessageModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isResizing = false;
        this.currentHandle = null;
        this.startWidth = 0;
        this.startHeight = 0;
        this.startX = 0;
        this.startY = 0;
        this.currentView = 'raw';
        this.messageData = null;

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                :host([visible]) {
                    display: block;
                    opacity: 1;
                }

                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    cursor: pointer;
                }

                .modal-container {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: rgba(30, 30, 30, 0.75);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: 600px;
                    height: 400px;
                    min-width: 300px;
                    min-height: 200px;
                    max-width: 90%;
                    max-height: 90%;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--secondary-color);
                }

                .modal-close {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }

                .modal-close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .modal-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .view-toggle {
                    display: flex;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 2px;
                }

                .toggle-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 6px 12px;
                    border-radius: 3px;
                    transition: all 0.2s;
                    text-transform: uppercase;
                }

                .toggle-btn.active {
                    background-color: var(--primary-color);
                    color: white;
                }

                .toggle-btn:hover:not(.active) {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .resize-handle {
                    position: absolute;
                    background-color: transparent;
                }

                .resize-handle-se {
                    bottom: 0;
                    right: 0;
                    width: 20px;
                    height: 20px;
                    cursor: se-resize;
                }

                .resize-handle-se::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 0;
                    height: 0;
                    border-style: solid;
                    border-width: 0 0 10px 10px;
                    border-color: transparent transparent #666 transparent;
                }

                .resize-handle-e {
                    top: 0;
                    right: 0;
                    width: 5px;
                    height: 100%;
                    cursor: e-resize;
                }

                .resize-handle-s {
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    cursor: s-resize;
                }

                .modal-body {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }

                .message {
                    font-family: monospace;
                    font-size: 14px;
                }

                .message-time {
                    color: #888;
                    font-size: 12px;
                    margin-bottom: 10px;
                }

                .message-content {
                    color: #fff;
                }

                .message-content pre {
                    margin: 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: monospace;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .message-icon {
                    font-size: 18px;
                }

                .message-text {
                    font-weight: 500;
                }

                .message-data {
                    margin-top: 8px;
                    font-size: 13px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: monospace;
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
            <div class="modal-overlay" id="overlay"></div>
            <div class="modal-container" id="modalContainer">
                <div class="modal-header">
                    <div class="modal-title">消息详情</div>
                    <div class="modal-controls">
                        <div class="view-toggle">
                            <button class="toggle-btn active" data-view="raw">RAW</button>
                            <button class="toggle-btn" data-view="body">BODY</button>
                        </div>
                        <button class="modal-close" id="closeBtn">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="message">
                        <div class="message-time" id="modalTime"></div>
                        <div class="message-content" id="modalContent"></div>
                    </div>
                </div>
                <div class="resize-handle resize-handle-e" data-direction="e"></div>
                <div class="resize-handle resize-handle-s" data-direction="s"></div>
                <div class="resize-handle resize-handle-se" data-direction="se"></div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.querySelector('#overlay').addEventListener('click', () => this.hide());
        this.shadowRoot.querySelector('#closeBtn').addEventListener('click', () => this.hide());

        // 防止点击内容区域时关闭弹窗
        this.shadowRoot.querySelector('.modal-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 初始化调整大小功能
        this.initResize();

        // 初始化视图切换功能
        this.initViewToggle();
    }

    /**
     * 初始化视图切换功能
     */
    initViewToggle() {
        const buttons = this.shadowRoot.querySelectorAll('.toggle-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    }

    /**
     * 切换视图
     */
    switchView(view) {
        this.currentView = view;

        // 更新按钮状态
        const buttons = this.shadowRoot.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 更新显示内容
        this.updateContent();
    }

    /**
     * 更新显示内容
     */
    updateContent() {
        if (!this.messageData) return;

        const contentEl = this.shadowRoot.querySelector('#modalContent');
        let contentHtml = '';

        if (this.currentView === 'raw') {
            // 显示完整消息
            if (typeof this.messageData.content === 'object' && this.messageData.content.icon) {
                contentHtml = `
                    <div class="message-header">
                        <span class="message-icon">${this.messageData.content.icon}</span>
                        <span class="message-text">${this.escapeHtml(this.messageData.content.message)}</span>
                    </div>
                    ${this.messageData.content.data ? `<pre>${JSON.stringify(this.messageData.content.data, null, 2)}</pre>` : ''}
                `;
            } else if (typeof this.messageData.content === 'object') {
                // 其他对象类型，直接 JSON 化
                contentHtml = `<pre>${JSON.stringify(this.messageData.content, null, 2)}</pre>`;
            } else {
                // 字符串类型，直接显示
                contentHtml = this.escapeHtml(this.messageData.content);
            }
        } else {
            // 只显示 BODY 数据
            if (typeof this.messageData.content === 'object' && this.messageData.content.data) {
                // 检查是否是 WebSocket 消息（有 direction 属性）
                if (this.messageData.content.data.direction) {
                    // WebSocket 消息
                    contentHtml = `<pre>${this.escapeHtml(this.messageData.content.data.data)}</pre>`;
                } else if (this.messageData.content.data.body) {
                    // 请求/响应消息
                    contentHtml = `<pre>${this.escapeHtml(this.messageData.content.data.body)}</pre>`;
                } else {
                    contentHtml = '';
                }
            } else {
                // 其他情况不显示内容
                contentHtml = '';
            }
        }

        contentEl.innerHTML = contentHtml;
    }

    /**
     * 初始化调整大小功能
     */
    initResize() {
        const handles = this.shadowRoot.querySelectorAll('.resize-handle');

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e, handle));
        });

        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
    }

    /**
     * 开始调整大小
     */
    startResize(e, handle) {
        e.preventDefault();
        this.isResizing = true;
        this.currentHandle = handle;

        const container = this.shadowRoot.querySelector('#modalContainer');
        const rect = container.getBoundingClientRect();

        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startX = e.clientX;
        this.startY = e.clientY;

        document.body.style.cursor = window.getComputedStyle(handle).cursor;
        document.body.style.userSelect = 'none';
    }

    /**
     * 执行调整大小
     */
    doResize(e) {
        if (!this.isResizing) return;

        const container = this.shadowRoot.querySelector('#modalContainer');
        const direction = this.currentHandle.dataset.direction;
        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;

        if (direction.includes('e')) {
            newWidth = Math.max(300, this.startWidth + deltaX);
        }
        if (direction.includes('s')) {
            newHeight = Math.max(200, this.startHeight + deltaY);
        }

        // 限制最大尺寸
        newWidth = Math.min(newWidth, window.innerWidth * 0.9);
        newHeight = Math.min(newHeight, window.innerHeight * 0.9);

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
    }

    /**
     * 停止调整大小
     */
    stopResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        this.currentHandle = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    /**
     * 显示弹窗
     * @param {string} type 消息类型
     * @param {string|object} content 消息内容
     * @param {string} [time] 时间戳
     */
    show(type, content, time) {
        // 保存完整的消息数据
        this.messageData = { type, content, time };

        const timestamp = time || new Date().toLocaleTimeString();
        const timeEl = this.shadowRoot.querySelector('#modalTime');
        const messageEl = this.shadowRoot.querySelector('.message');

        // 设置时间
        timeEl.textContent = `[${timestamp}] ${type}:`;

        // 设置消息类名
        if (typeof content === 'object' && content.type) {
            messageEl.className = `message message-${content.type}`;
        } else {
            messageEl.className = 'message';
        }

        // 重置视图为 RAW
        this.currentView = 'raw';
        const buttons = this.shadowRoot.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            if (btn.dataset.view === 'raw') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 更新内容
        this.updateContent();

        this.setAttribute('visible', '');
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏弹窗
     */
    hide() {
        this.removeAttribute('visible');
        document.body.style.overflow = '';
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

customElements.define('message-modal', MessageModal);