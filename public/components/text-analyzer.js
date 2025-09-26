// 导入文本历史存储工具类
import TextHistoryStorage from '../utils/text-history-storage.js';

class TextAnalyzer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.data = null;
        this.textHistory = null;  // 文本历史存储实例
        this.lastSelectionPosition = null;  // 记录最后一次选择的位置
        this.autoSelectEnabled = true;  // 是否启用自动选择功能
        this.lastExpandedRange = null;  // 记录最后一次扩展的选择范围

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

        // 每次设置新数据时创建新的历史存储实例
        if (data && data.content !== undefined) {
            // 直接使用原始内容
            this.textHistory = new TextHistoryStorage(data.content);

            // 记录全部文本的选择位置（作为初始状态）
            const originalText = this.textHistory.originalText;
            this.textHistory.recordSelection(0, originalText.length, 'MSG');

            // 检查是否包含 body 字段并自动选择
            this.checkAndSelectBody();
        } else {
            // 如果没有有效内容，清除历史存储
            this.textHistory = null;
        }

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

        // 从工具类获取当前选择文本
        if (this.textHistory) {
            const currentText = this.textHistory.getCurrentText();
            contentContainer.innerHTML = `<pre>${this.escapeHtml(currentText)}</pre>`;
        } else {
            // 如果没有历史存储，显示空状态
            this.showEmptyState();
        }
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
        // 监听选择变化事件
        document.addEventListener('selectionchange', (e) => {
            const selection = this.shadowRoot.getSelection();

            // 检查是否是我们自己触发的扩展
            if (selection && selection.rangeCount > 0 && this.lastExpandedRange) {
                const range = selection.getRangeAt(0);
                if (range.startContainer === this.lastExpandedRange.startContainer &&
                    range.startOffset === this.lastExpandedRange.startOffset &&
                    range.endContainer === this.lastExpandedRange.endContainer &&
                    range.endOffset === this.lastExpandedRange.endOffset) {
                    // 这是我们自己触发的扩展，忽略
                    this.lastExpandedRange = null;
                    return;
                }
            }

            // 清除扩展记录
            this.lastExpandedRange = null;

            if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
                // 有有效选择
                const position = this.expandSelectionToString(selection);

                // 保存选择位置
                if (position) {
                    this.lastSelectionPosition = position;
                }

                // 触发自定义事件通知选择变化
                this.notifySelectionChange(position);
            } else if (this.lastSelectionPosition) {
                // 选择被清空或内容为空
                this.lastSelectionPosition = null;
                this.notifySelectionChange(null);
            }
        });
    }

    /**
     * 扩展选择到完整字符串（使用 Shadow DOM selection）
     * @param {Selection} selection - 当前选择对象
     * @returns {object} 位置信息 {start, end}
     */
    expandSelectionToString(selection) {
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);

        // 查找最近的 pre 元素
        let preElement = range.startContainer;
        while (preElement && preElement.tagName !== 'PRE') {
            preElement = preElement.parentNode;
        }

        if (!preElement || preElement.tagName !== 'PRE') {
            return;
        }

        // 获取完整的文本内容（处理多个文本节点的情况）
        const textNodes = Array.from(preElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length === 0) {
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

        // 如果自动选择功能已禁用，直接返回当前选择的位置
        if (!this.autoSelectEnabled) {
            return {
                start: startOffset,
                end: endOffset
            };
        }

        // 查找完整的字符串边界
        const stringStart = this.findStringBoundary(fullText, startOffset, true);
        const stringEnd = this.findStringBoundary(fullText, endOffset, false);

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
            return null;
        }

        // 创建新的选择范围
        const newRange = document.createRange();
        newRange.setStart(startNode, startNodeOffset);
        newRange.setEnd(endNode, endNodeOffset);

        // 记录扩展前的选择范围
        const originalRange = selection.getRangeAt(0);

        // 保存新范围的信息
        this.lastExpandedRange = {
            startContainer: newRange.startContainer,
            startOffset: newRange.startOffset,
            endContainer: newRange.endContainer,
            endOffset: newRange.endOffset
        };

        selection.removeAllRanges();
        selection.addRange(newRange);

        // 返回扩展后的位置信息
        return {
            start: stringStart,
            end: stringEnd
        };
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
     * 触发选择变化事件
     * @param {object|null} position - 选择位置信息
     */
    notifySelectionChange(position) {
        this.dispatchEvent(new CustomEvent('selection-changed', {
            detail: {
                position: position
            },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * 使用选中的文本替换当前显示的内容
     */
    useSelectedText() {
        if (!this.textHistory || !this.lastSelectionPosition) return;

        // 使用记录的位置信息
        const { start, end } = this.lastSelectionPosition;

        // 记录选择位置到历史存储
        this.textHistory.recordSelection(start, end);

        // 重新渲染显示新的内容
        this.render();

        // 触发内容变化事件
        this.dispatchEvent(new CustomEvent('content-replaced', {
            detail: {
                start: start,
                end: end
            },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * 检查并自动选择 body 字段
     */
    checkAndSelectBody() {
        if (!this.textHistory) return;

        const currentText = this.textHistory.getCurrentText();

        try {
            // 尝试解析当前文本为 JSON
            const parsed = JSON.parse(currentText);

            // 检查是否有 body 字段
            if (parsed && parsed.body !== undefined) {
                // 将 body 部分格式化为字符串
                const bodyStr = JSON.stringify(parsed.body, null, 2);

                // 在文本中查找 body 部分的位置
                const bodyIndex = currentText.indexOf(bodyStr);
                if (bodyIndex !== -1) {
                    // 记录 body 内容的选择位置
                    this.textHistory.recordSelection(bodyIndex, bodyIndex + bodyStr.length, 'BODY');

                    // 更新最后选择位置
                    this.lastSelectionPosition = {
                        start: bodyIndex,
                        end: bodyIndex + bodyStr.length
                    };
                }
            }
        } catch (e) {
            // 解析失败，不是 JSON 格式，不做处理
            console.warn("Failed to parse JSON for body selection:", e);
        }
    }

 
    /**
     * 设置自动选择功能是否启用
     * @param {boolean} enabled - 是否启用自动选择
     */
    setAutoSelectEnabled(enabled) {
        this.autoSelectEnabled = enabled;
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