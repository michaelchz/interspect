class TextAnalyzer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.data = null;

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: monospace;
                    font-size: 14px;
                }

                .content-container {
                    color: #fff;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .content-container pre {
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

                .empty-state {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    padding: 20px;
                }
            </style>
            <div class="content-container" id="contentContainer">
                <div class="empty-state">无数据可显示</div>
            </div>
        `;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // 绑定鼠标事件
        this.initSmartSelection();
    }

    /**
     * 设置分析数据
     * @param {object} data - 消息数据
     */
    setData(data) {
        this.data = data;
        this.render();
    }

    /**
     * 渲染内容
     */
    render() {
        if (!this.data) {
            this.showEmptyState();
            return;
        }

        const contentContainer = this.shadowRoot.querySelector('#contentContainer');
        let content = '';

        // 根据数据类型显示内容
        if (typeof this.data.content === 'object') {
            // 对象类型，直接 JSON 化
            const jsonStr = JSON.stringify(this.data.content, null, 2);
            content = `<pre>${this.escapeHtml(jsonStr)}</pre>`;
        } else {
            // 字符串类型，使用 pre 标签保持格式
            content = `<pre>${this.escapeHtml(this.data.content)}</pre>`;
        }

        contentContainer.innerHTML = content;
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        const contentContainer = this.shadowRoot.querySelector('#contentContainer');
        contentContainer.innerHTML = '<div class="empty-state">无数据可显示</div>';
    }

    /**
     * 初始化智能选择功能
     */
    initSmartSelection() {
        let isDoubleClick = false;

        // 在 shadowRoot 内监听事件
        this.shadowRoot.addEventListener('mouseup', (e) => {
            // 延迟执行，确保选择已完成
            setTimeout(() => {
                // 如果是双击事件，不处理
                if (isDoubleClick) {
                    isDoubleClick = false;
                    return;
                }

                const selection = this.shadowRoot.getSelection();
                console.log('Shadow DOM selection detected:', selection?.toString());

                if (selection && selection.toString().trim()) {
                    this.expandSelectionToString(selection);

                    // 触发自定义事件通知选择变化
                    this.dispatchEvent(new CustomEvent('selection-changed', {
                        detail: {
                        },
                        bubbles: true,
                        composed: true
                    }));
                } else if (selection && selection.toString()) {
                    // 有选择内容但只有空白字符，清空选择
                    selection.removeAllRanges();
                }
            }, 10);
        });

        // 监听键盘事件，支持双击选择
        this.shadowRoot.addEventListener('dblclick', (e) => {
            isDoubleClick = true;

            setTimeout(() => {
                const selection = this.shadowRoot.getSelection();
                console.log('Double click selection:', selection?.toString());

                if (selection && selection.toString().trim()) {
                    this.expandSelectionToString(selection);

                    // 触发自定义事件通知选择变化
                    this.dispatchEvent(new CustomEvent('selection-changed', {
                        detail: {
                        },
                        bubbles: true,
                        composed: true
                    }));
                }
            }, 10);
        });
    }

    /**
     * 扩展选择到完整字符串（使用 Shadow DOM selection）
     * @param {Selection} selection - 当前选择对象
     */
    expandSelectionToString(selection) {
        console.log('expandSelectionToString called with Shadow DOM selection');
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        console.log('Shadow DOM range:', range);
        console.log('Start container:', range.startContainer, 'offset:', range.startOffset);
        console.log('End container:', range.endContainer, 'offset:', range.endOffset);

        // 查找最近的 pre 元素
        let preElement = range.startContainer;
        while (preElement && preElement.tagName !== 'PRE') {
            preElement = preElement.parentNode;
        }

        if (!preElement || preElement.tagName !== 'PRE') {
            console.log('No pre element found in selection path');
            return;
        }

        console.log('Found pre element:', preElement);

        // 获取完整的文本内容（处理多个文本节点的情况）
        const textNodes = Array.from(preElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length === 0) {
            console.log('No text nodes found in pre element');
            return;
        }

        // 合并所有文本节点的内容，并记录每个节点的偏移量
        let fullText = '';
        const nodeOffsets = [{ node: textNodes[0], start: 0, end: 0 }];

        for (let i = 0; i < textNodes.length; i++) {
            const node = textNodes[i];
            const start = fullText.length;
            const text = node.textContent;
            fullText += text;
            const end = fullText.length;

            if (i < textNodes.length - 1) {
                nodeOffsets.push({ node: textNodes[i + 1], start: end, end: end });
            }
            nodeOffsets[i].end = end;
        }

        console.log('Full text length:', fullText.length);
        console.log('Text nodes count:', textNodes.length);

        // 计算选择在整个文本中的位置
        let startOffset = 0;
        let endOffset = 0;

        // 查找起始位置
        for (const offset of nodeOffsets) {
            if (range.startContainer === offset.node) {
                startOffset = offset.start + range.startOffset;
                break;
            }
        }

        // 查找结束位置
        for (const offset of nodeOffsets) {
            if (range.endContainer === offset.node) {
                endOffset = offset.start + range.endOffset;
                break;
            }
        }

        console.log('Calculated offsets:', startOffset, 'to', endOffset);

        // 查找完整的字符串边界
        const stringStart = this.findStringBoundary(fullText, startOffset, true);
        const stringEnd = this.findStringBoundary(fullText, endOffset, false);

        console.log('String boundaries:', stringStart, 'to', stringEnd);

        // 根据边界位置找到对应的文本节点和偏移量
        let startNode = null;
        let startNodeOffset = 0;
        let endNode = null;
        let endNodeOffset = 0;

        for (const offset of nodeOffsets) {
            if (stringStart >= offset.start && stringStart < offset.end) {
                startNode = offset.node;
                startNodeOffset = stringStart - offset.start;
            }
            if (stringEnd > offset.start && stringEnd <= offset.end) {
                endNode = offset.node;
                endNodeOffset = stringEnd - offset.start;
                break;
            }
        }

        if (!startNode || !endNode) {
            console.log('Could not find target nodes');
            return;
        }

        console.log('Target nodes - start:', startNode, 'offset:', startNodeOffset);
        console.log('Target nodes - end:', endNode, 'offset:', endNodeOffset);

        // 创建新的选择范围
        const newRange = document.createRange();
        newRange.setStart(startNode, startNodeOffset);
        newRange.setEnd(endNode, endNodeOffset);

        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    /**
     * 查找字符串边界（使用 StringBoundaryFinder）
     * @param {string} text - 完整文本
     * @param {number} position - 开始位置
     * @param {boolean} findStart - 是否查找开始边界
     * @returns {number} 边界位置
     */
    findStringBoundary(text, position, findStart) {
        return StringBoundaryFinder.findStringBoundary(text, position, findStart);
    }

    /**
     * 使用选中的文本替换当前显示的内容
     */
    useSelectedText() {
        // 获取当前选中的文本
        const selection = this.shadowRoot.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';

        if (!selectedText) return;

        // 解析带引号的字符串，获取实际值
        const actualText = this.parseQuotedString(selectedText);

        // 创建新的消息数据，使用实际的文本值
        const newData = {
            type: 'string',
            content: actualText
        };

        // 更新数据并重新渲染
        this.setData(newData);

        // 触发内容变化事件
        this.dispatchEvent(new CustomEvent('content-replaced', {
            detail: {
                selectedText: actualText
            },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * 解析转义的字符串
     * @param {string} text - 带引号的字符串
     * @returns {string} 解析后的实际值
     */
    parseQuotedString(text) {
        if (!text || typeof text !== 'string') return text;

        const trimmed = text.trim();

        // 检查是否是带引号的字符串
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            try {
                // 处理单引号字符串
                if (trimmed.startsWith("'")) {
                    // 转换为 JSON 格式：转义内部双引号和反斜杠
                    const normalized = '"' +
                        trimmed
                            .slice(1, -1)  // 去掉外层单引号
                            .replace(/"/g, '\\"')  // 转义内部双引号
                            .replace(/\\/g, '\\\\')  // 转义反斜杠
                        + '"';
                    return JSON.parse(normalized);
                } else {
                    // 双引号字符串直接解析
                    return JSON.parse(trimmed);
                }
            } catch (e) {
                console.warn('Failed to parse quoted string:', e);
                return text;
            }
        }

        // 不是带引号的字符串，原样返回
        return text;
    }

    /**
     * HTML 转义
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

customElements.define('text-analyzer', TextAnalyzer);