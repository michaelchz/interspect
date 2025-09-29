class PathInputModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onConfirm = null;
        this.onCancel = null;

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
                    background-color: rgba(30, 30, 30, 0.95);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    width: 500px;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: hidden;
                }

                .modal-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-color);
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-color-secondary);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: var(--text-color);
                }

                .modal-body {
                    padding: 20px;
                }

                .input-group {
                    margin-bottom: 16px;
                }

                .input-label {
                    display: block;
                    font-size: 14px;
                    color: var(--text-color);
                    margin-bottom: 8px;
                }

                .path-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background-color: rgba(255, 255, 255, 0.05);
                    color: var(--text-color);
                    font-size: 14px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    box-sizing: border-box;
                }

                .path-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    background-color: rgba(255, 255, 255, 0.08);
                }

                .help-text {
                    font-size: 12px;
                    color: var(--text-color-secondary);
                    margin-top: 8px;
                    line-height: 1.4;
                }

                .ignored-paths {
                    margin-top: 20px;
                }

                .ignored-paths-title {
                    font-size: 14px;
                    color: var(--text-color);
                    margin-bottom: 12px;
                    font-weight: 500;
                }
                .path-count {
                    margin-left: 4px;
                    font-size: 12px;
                    opacity: 0.7;
                }

                .path-list {
                    max-height: 150px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background-color: rgba(255, 255, 255, 0.02);
                }

                .path-item {
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    color: var(--text-color);
                }

                .path-item:last-child {
                    border-bottom: none;
                }

                .path-item:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }

                .remove-path-btn {
                    background: none;
                    border: none;
                    color: #ff5252;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                }

                .remove-path-btn:hover {
                    background-color: rgba(255, 82, 82, 0.2);
                }
                .add-path-btn {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #4caf50;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                    opacity: 0.6;
                }
                .add-path-btn:hover {
                    opacity: 1;
                    background-color: rgba(76, 175, 80, 0.1);
                }

                .modal-footer {
                    padding: 16px 20px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .btn {
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background-color: transparent;
                    color: var(--text-color);
                }

                .btn:hover {
                    transform: translateY(-1px);
                }

                .btn-primary {
                    background-color: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }

                .btn-primary:hover {
                    background-color: var(--primary-color-hover);
                    border-color: var(--primary-color-hover);
                }

                .btn-secondary {
                    background-color: transparent;
                }

                .btn-secondary:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
            </style>

            <div class="modal-overlay" id="overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">忽略路径设置</h3>
                    <button class="close-btn" id="close-btn" title="关闭">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label class="input-label" for="path-input">添加要忽略的路径：</label>
                        <div style="position: relative;">
                            <input type="text" id="path-input" class="path-input" placeholder="例如: /api/users, /auth/*" />
                            <button id="add-path-btn" class="add-path-btn" title="添加路径">✓</button>
                        </div>
                        <div class="help-text">
                            支持通配符 * 匹配任意字符，例如：<br>
                            • /api/users - 忽略所有包含 /api/users 的路径<br>
                            • /api/* - 忽略所有包含 /api/ 的路径<br>
                            • *.json - 忽略所有包含 .json 的路径<br>
                            • */health - 忽略所有以 /health 结尾的路径
                        </div>
                    </div>
                    <div class="ignored-paths">
                        <div class="ignored-paths-title">
                            已忽略的路径：
                            <span id="path-count" class="path-count">(0)</span>
                        </div>
                        <div class="path-list" id="path-list">
                            <!-- 路径列表将在这里动态生成 -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-btn">不应用过滤</button>
                    <button class="btn btn-primary" id="confirm-btn">应用过滤</button>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定事件
        this.shadowRoot.getElementById('overlay').addEventListener('click', () => this.hide());
        this.shadowRoot.getElementById('close-btn').addEventListener('click', () => this.hide());
        this.shadowRoot.getElementById('cancel-btn').addEventListener('click', () => this.hide());
        this.shadowRoot.getElementById('confirm-btn').addEventListener('click', () => this.handleConfirm());
        this.shadowRoot.getElementById('path-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addPath();
            }
        });
        this.shadowRoot.getElementById('add-path-btn').addEventListener('click', () => {
            this.addPath();
        });
    }

    connectedCallback() {
        document.addEventListener('keydown', this.handleKeyDown);
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown(e) {
        if (this.hasAttribute('visible') && e.key === 'Escape') {
            this.hide();
        }
    }

    show(ignoredPaths = []) {
        this.setAttribute('visible', '');
        document.body.style.overflow = 'hidden';

        // 更新路径列表
        this.updatePathList(ignoredPaths);

        // 聚焦到输入框
        setTimeout(() => {
            this.shadowRoot.getElementById('path-input').focus();
        }, 100);
    }

    hide() {
        this.removeAttribute('visible');
        document.body.style.overflow = '';

        // 清空输入框
        this.shadowRoot.getElementById('path-input').value = '';
    }

    updatePathList(paths) {
        const pathList = this.shadowRoot.getElementById('path-list');
        const countElement = this.shadowRoot.getElementById('path-count');

        // 更新数量显示
        if (countElement) {
            countElement.textContent = `(${paths.length})`;
        }

        pathList.innerHTML = '';

        if (paths.length === 0) {
            pathList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-color-secondary); font-size: 13px;">暂无忽略的路径</div>';
            return;
        }

        paths.forEach((path, index) => {
            const pathItem = document.createElement('div');
            pathItem.className = 'path-item';
            pathItem.innerHTML = `
                <span>${path}</span>
                <button class="remove-path-btn" data-index="${index}">&times;</button>
            `;
            pathList.appendChild(pathItem);

            // 绑定删除按钮事件
            pathItem.querySelector('.remove-path-btn').addEventListener('click', () => {
                this.removePath(index);
            });
        });
    }

    addPath() {
        const input = this.shadowRoot.getElementById('path-input');
        const path = input.value.trim();

        if (path && this.onAddPath) {
            this.onAddPath(path);
            input.value = '';
        }
    }

    removePath(index) {
        if (this.onRemovePath) {
            this.onRemovePath(index);
        }
    }

    handleConfirm() {
        if (this.onConfirm) {
            this.onConfirm();
        }
        this.hide();
    }
}

customElements.define('path-input-modal', PathInputModal);