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
        this.messageData = null;
        this.autoSelectEnabled = true;

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
                    width: 80vw;
                    height: 80vh;
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
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .history-path {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 14px;
                    color: #888;
                }

                .history-path-item {
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 3px;
                    transition: background-color 0.2s;
                }

                .history-path-item:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .history-path-item.active {
                    color: var(--secondary-color);
                }

                .history-path-separator {
                    color: #666;
                    margin: 0 2px;
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

                .copy-selection-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .copy-selection-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: var(--primary-color);
                }

                .copy-selection-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .modal-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .auto-select-control {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-right: 10px;
                }

                .auto-select-label {
                    font-size: 12px;
                    color: #888;
                    cursor: pointer;
                    user-select: none;
                }

                .switch {
                    position: relative;
                    width: 36px;
                    height: 18px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 9px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                .switch.active {
                    background-color: var(--primary-color);
                }

                .switch-slider {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 14px;
                    height: 14px;
                    background-color: white;
                    border-radius: 50%;
                    transition: transform 0.3s;
                }

                .switch.active .switch-slider {
                    transform: translateX(18px);
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

                </style>
            <div class="modal-overlay" id="overlay"></div>
            <div class="modal-container" id="modalContainer">
                <div class="modal-header">
                    <div class="modal-title">
                        <span>消息详情</span>
                        <div class="history-path" id="historyPath"></div>
                    </div>
                    <div class="modal-controls">
                        <div class="auto-select-control">
                            <label class="auto-select-label" for="autoSelectSwitch">自动选择</label>
                            <div class="switch active" id="autoSelectSwitch">
                                <div class="switch-slider"></div>
                            </div>
                        </div>
                        <button class="copy-selection-btn" id="copySelectionBtn" title="使用选中内容">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                            </svg>
                        </button>
                        <button class="modal-close" id="closeBtn">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="message">
                        <div class="message-time" id="modalTime"></div>
                        <text-analyzer id="textAnalyzer"></text-analyzer>
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
        this.shadowRoot.querySelector('#copySelectionBtn').addEventListener('click', () => {
            const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');
            if (textAnalyzer && typeof textAnalyzer.useSelectedText === 'function') {
                textAnalyzer.useSelectedText();
            }
        });

        // 绑定自动选择开关事件
        this.shadowRoot.querySelector('#autoSelectSwitch').addEventListener('click', () => {
            this.toggleAutoSelect();
        });

        // 防止点击内容区域时关闭弹窗
        this.shadowRoot.querySelector('.modal-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 初始化调整大小功能
        this.initResize();

        // 初始化选择监听
        this.initSelectionListener();
    }


    /**
     * 切换自动选择功能
     */
    toggleAutoSelect() {
        this.autoSelectEnabled = !this.autoSelectEnabled;

        // 更新开关UI
        const switchEl = this.shadowRoot.querySelector('#autoSelectSwitch');
        if (switchEl) {
            if (this.autoSelectEnabled) {
                switchEl.classList.add('active');
            } else {
                switchEl.classList.remove('active');
            }
        }

        // 控制文本分析器的自动选择功能
        const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');
        if (textAnalyzer) {
            if (textAnalyzer.setAutoSelectEnabled && typeof textAnalyzer.setAutoSelectEnabled === 'function') {
                textAnalyzer.setAutoSelectEnabled(this.autoSelectEnabled);
            }
        }
    }

    /**
     * 更新历史路径显示
     */
    updateHistoryPath() {
        const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');
        const historyPath = this.shadowRoot.querySelector('#historyPath');

        if (!textAnalyzer || !textAnalyzer.textHistory) {
            historyPath.innerHTML = '';
            return;
        }

        const historyInfo = textAnalyzer.textHistory.getHistoryInfo();
        const currentIndex = textAnalyzer.textHistory.currentIndex;

        // 构建路径HTML
        let pathHtml = '';

        historyInfo.forEach((item, index) => {
            if (index > 0) {
                pathHtml += '<span class="history-path-separator">›</span>';
            }

            const isActive = index === currentIndex;
            const itemClass = isActive ? 'history-path-item active' : 'history-path-item';

            let label = this.escapeHtml(item.label);
            if (item.position) {
                // 如果是选择项，添加位置信息
                const length = item.position.length || 0;
                label += ` (${length})`;
            }

            pathHtml += `<span class="${itemClass}" data-index="${index}" title="${this.escapeHtml(item.preview)}">${label}</span>`;
        });

        historyPath.innerHTML = pathHtml;

        // 绑定点击事件
        const pathItems = historyPath.querySelectorAll('.history-path-item');
        pathItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.goToHistory(index);
            });
        });
    }

    /**
     * 跳转到指定历史记录
     * @param {number} index - 历史索引
     */
    goToHistory(index) {
        const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');
        if (!textAnalyzer || !textAnalyzer.textHistory) return;

        // 跳转到指定历史
        const text = textAnalyzer.textHistory.goTo(index);

    
        // 强制更新文本分析器的显示
        const contentContainer = textAnalyzer.shadowRoot.querySelector('#contentContainer');
        if (contentContainer) {
            contentContainer.innerHTML = `<pre>${textAnalyzer.escapeHtml(text)}</pre>`;
        }

        // 更新历史路径显示
        this.updateHistoryPath();
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

        // 更新内容
        const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');
        if (textAnalyzer) {
            textAnalyzer.setData({
                type: this.messageData.type,
                content: this.messageData.content.data
            });

            // 延迟更新历史路径，等待文本分析器初始化完成
            setTimeout(() => {
                this.updateHistoryPath();
            }, 100);
        }

        // 初始化复制选择按钮为禁用状态
        const copyBtn = this.shadowRoot.querySelector('#copySelectionBtn');
        if (copyBtn) {
            copyBtn.disabled = true;
        }

        // 重置自动选择开关为开启状态
        this.autoSelectEnabled = true;
        const switchEl = this.shadowRoot.querySelector('#autoSelectSwitch');
        if (switchEl) {
            switchEl.classList.add('active');
        }

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
     * 初始化选择监听
     */
    initSelectionListener() {
        const textAnalyzer = this.shadowRoot.querySelector('#textAnalyzer');

        // 监听文本分析器的选择变化事件
        textAnalyzer.addEventListener('selection-changed', (e) => {
            // 根据是否有有效的选择位置来控制按钮状态
            const copyBtn = this.shadowRoot.querySelector('#copySelectionBtn');
            if (copyBtn) {
                const hasSelection = e.detail.position &&
                    e.detail.position.start !== undefined &&
                    e.detail.position.end !== undefined &&
                    e.detail.position.start < e.detail.position.end;
                copyBtn.disabled = !hasSelection;
            }

            // 更新历史路径显示
            setTimeout(() => {
                this.updateHistoryPath();
            }, 50);
        });

        // 监听内容替换事件
        textAnalyzer.addEventListener('content-replaced', (e) => {
            // 内容替换后禁用复制选择按钮
            const copyBtn = this.shadowRoot.querySelector('#copySelectionBtn');
            if (copyBtn) {
                copyBtn.disabled = true;
            }

            // 更新历史路径显示
            setTimeout(() => {
                this.updateHistoryPath();
            }, 50);
        });
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