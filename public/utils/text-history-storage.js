/**
 * 文本历史记录工具类
 * 基于位置记录文本选择历史，支持历史回溯
 */
class TextHistoryStorage {
    /**
     * 构造函数
     * @param {any} content - 原始内容
     */
    constructor(content) {
        // 按照 render() 函数中的逻辑进行初始转换
        if (typeof content === 'object') {
            // 对象类型，直接 JSON 化
            this.originalText = JSON.stringify(content, null, 2);
        } else if (typeof content === 'string') {
            // 字符串类型，尝试解析为 JSON
            try {
                // 去除首尾空白字符
                const trimmed = content.trim();

                // 检查是否是 JSON 格式
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                    (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    const parsed = JSON.parse(trimmed);
                    this.originalText = JSON.stringify(parsed, null, 2);
                } else {
                    // 不是 JSON，直接使用原字符串
                    this.originalText = content;
                }
            } catch (e) {
                // 解析失败，直接使用原字符串
                this.originalText = content;
            }
        } else {
            // 其他类型，转换为字符串
            this.originalText = String(content);
        }

        this.positions = [];  // 位置历史序列
        this.currentIndex = -1;  // 当前历史索引
        this.lastText = this.originalText;  // 上一次生成的文本
    }

    /**
     * 记录选择位置
     * @param {number} start - 起始位置
     * @param {number} end - 结束位置
     */
    recordSelection(start, end) {
        // 移除当前位置之后的历史记录（如果有的话）
        if (this.currentIndex < this.positions.length - 1) {
            this.positions = this.positions.slice(0, this.currentIndex + 1);
        }

        // 更新上次文本为当前生成的文本
        this.lastText = this.getCurrentText();

        // 根据位置获取字符串内容，并判断是否 useStringify
        const content = this.lastText.slice(start, end);
        let useStringify = false;

        try {
            // 去除首尾空白字符
            const trimmed = this.parseQuotedString(content).trim();

            // 检查是否是 JSON 格式
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                // 尝试解析验证是否为有效 JSON
                JSON.parse(trimmed);
                useStringify = true;
            }
        } catch (e) {
            // 解析失败，不是有效 JSON
            useStringify = false;
        }

        // 添加新的位置记录
        this.positions.push({
            start,
            end,
            useStringify
        });

        // 更新当前索引
        this.currentIndex = this.positions.length - 1;
    }

    /**
     * 获取当前版本的文本
     * @returns {string} 当前版本的文本
     */
    getCurrentText() {
        if (this.currentIndex < 0) {
            return this.originalText;
        }

        const pos = this.positions[this.currentIndex];
        let text = this.lastText.slice(pos.start, pos.end);
        text = this.parseQuotedString(text);

        if (pos.useStringify) {
            try {
                // 尝试解析为 JSON，然后重新格式化
                const parsed = JSON.parse(text);
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                // 解析失败，返回原始选中文本
                return text;
            }
        }

        return text;
    }

    /**
     * 获取指定索引版本的文本
     * @param {number} index - 历史索引
     * @returns {string} 指定版本的文本
     */
    getTextAt(index) {
        let text;

        if (index < 0 || index >= this.positions.length) {
            text = this.originalText;
        } else {
            const pos = this.positions[index];
            text = this.originalText.slice(pos.start, pos.end);

            if (pos.useStringify) {
                try {
                    const parsed = JSON.parse(text);
                    text = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // text 保持不变
                }
            }
        }

        // 对最终文本进行 HTML 转义
        return this.escapeHtml(text);
    }

    /**
     * 撤销到上一个历史版本
     * @returns {string} 撤销后的文本
     */
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            return this.getCurrentText();
        }
        return this.getCurrentText();
    }

    /**
     * 重做到下一个历史版本
     * @returns {string} 重做后的文本
     */
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            return this.getCurrentText();
        }
        return this.getCurrentText();
    }

    /**
     * 跳转到指定历史版本
     * @param {number} index - 目标索引
     * @returns {string} 目标版本的文本
     */
    goTo(index) {
        if (index >= -1 && index < this.positions.length) {
            this.currentIndex = index;
            return this.getCurrentText();
        }
        return this.getCurrentText();
    }

    /**
     * 检查是否可以撤销
     * @returns {boolean}
     */
    canUndo() {
        return this.currentIndex > -1;
    }

    /**
     * 检查是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this.currentIndex < this.positions.length - 1;
    }

    /**
     * 获取当前历史信息
     * @returns {object} 当前历史信息
     */
    getCurrentInfo() {
        if (this.currentIndex < 0) {
            return {
                index: -1,
                total: 0,
                isOriginal: true
            };
        }

        const pos = this.positions[this.currentIndex];
        return {
            index: this.currentIndex,
            total: this.positions.length,
            isOriginal: false,
            position: {
                start: pos.start,
                end: pos.end,
                length: pos.end - pos.start
            },
            useStringify: pos.useStringify
        };
    }

    /**
     * 获取所有历史记录的信息
     * @returns {Array} 历史记录信息数组
     */
    getHistoryInfo() {
        const info = [];

        // 添加原始文本信息
        info.push({
            index: -1,
            label: '原始文本',
            isOriginal: true,
            preview: this.originalText.substring(0, 50) + (this.originalText.length > 50 ? '...' : '')
        });

        // 添加每个选择记录的信息
        this.positions.forEach((pos, index) => {
            const selectedText = this.originalText.slice(pos.start, pos.end);
            info.push({
                index: index,
                label: `选择 ${index + 1}`,
                isOriginal: false,
                position: {
                    start: pos.start,
                    end: pos.end
                },
                useStringify: pos.useStringify,
                preview: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : '')
            });
        });

        return info;
    }

    /**
     * 清空历史记录
     */
    clear() {
        this.positions = [];
        this.currentIndex = -1;
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
}

// 导出类供其他模块使用
export default TextHistoryStorage;