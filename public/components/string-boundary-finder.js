/**
 * 字符串边界查找器
 * 提供纯字符串处理的边界查找算法，不涉及 DOM 操作
 */
class StringBoundaryFinder {
    /**
     * 查找字符串边界
     * @param {string} text - 完整文本
     * @param {number} position - 开始位置
     * @param {boolean} findStart - 是否查找开始边界
     * @returns {number} 边界位置
     */
    static findStringBoundary(text, position, findStart) {
        // 验证输入参数
        if (typeof text !== 'string' || position < 0 || position > text.length) {
            return findStart ? 0 : text.length;
        }

        let inString = false;
        let escapeNext = false;
        let quoteChar = null;

        // 首先确定当前位置是否在字符串内
        for (let i = 0; i < position; i++) {
            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            const char = text[i];

            if (char === '\\') {
                escapeNext = true;
            } else if ((char === '"' || char === "'") && !escapeNext) {
                if (!inString) {
                    inString = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inString = false;
                    quoteChar = null;
                }
            } else {
                escapeNext = false;
            }
        }

        // 根据查找方向移动到字符串边界
        if (findStart) {
            return this._findStartBoundary(text, position, inString, quoteChar);
        } else {
            return this._findEndBoundary(text, position, inString, quoteChar);
        }
    }

    /**
     * 查找字符串开始边界
     * @private
     */
    static _findStartBoundary(text, position, inString, quoteChar) {
        if (!inString) {
            // 向前查找最近的引号
            for (let i = position - 1; i >= 0; i--) {
                if (text[i] === '"' || text[i] === "'") {
                    // 检查是否被转义
                    if (!this._isEscaped(text, i)) {
                        return i;
                    }
                }
            }
            return 0;
        } else {
            // 已经在字符串内，向前查找开始引号
            for (let i = position - 1; i >= 0; i--) {
                if (text[i] === quoteChar && !this._isEscaped(text, i)) {
                    return i;
                }
            }
            return 0;
        }
    }

    /**
     * 查找字符串结束边界
     * @private
     */
    static _findEndBoundary(text, position, inString, quoteChar) {
        if (!inString) {
            // 向后查找最近的引号
            for (let i = position; i < text.length; i++) {
                if (text[i] === '"' || text[i] === "'") {
                    // 检查是否被转义
                    if (!this._isEscaped(text, i)) {
                        return i + 1;
                    }
                }
            }
            return text.length;
        } else {
            // 已经在字符串内，向后查找结束引号
            for (let i = position; i < text.length; i++) {
                if (text[i] === quoteChar && !this._isEscaped(text, i)) {
                    return i + 1;
                }
            }
            return text.length;
        }
    }

    /**
     * 检查字符是否被转义
     * @private
     */
    static _isEscaped(text, position) {
        let escapeCount = 0;
        let i = position - 1;

        while (i >= 0 && text[i] === '\\') {
            escapeCount++;
            i--;
        }

        return escapeCount % 2 === 1;
    }

    /**
     * 获取字符串片段（包含引号）
     * @param {string} text - 完整文本
     * @param {number} start - 开始位置
     * @param {number} end - 结束位置
     * @returns {string} 字符串片段
     */
    static getStringFragment(text, start, end) {
        const stringStart = this.findStringBoundary(text, start, true);
        const stringEnd = this.findStringBoundary(text, end, false);

        return text.substring(stringStart, stringEnd);
    }

    /**
     * 查找所有字符串
     * @param {string} text - 完整文本
     * @returns {Array<{start: number, end: number, value: string}>} 字符串数组
     */
    static findAllStrings(text) {
        const strings = [];
        let inString = false;
        let escapeNext = false;
        let quoteChar = null;
        let start = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
            } else if ((char === '"' || char === "'") && !escapeNext) {
                if (!inString) {
                    inString = true;
                    quoteChar = char;
                    start = i;
                } else if (char === quoteChar) {
                    inString = false;
                    strings.push({
                        start: start,
                        end: i + 1,
                        value: text.substring(start, i + 1)
                    });
                    quoteChar = null;
                }
            } else {
                escapeNext = false;
            }
        }

        return strings;
    }

    /**
     * 判断位置是否在字符串内
     * @param {string} text - 完整文本
     * @param {number} position - 位置
     * @returns {boolean} 是否在字符串内
     */
    static isInsideString(text, position) {
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < position && i < text.length; i++) {
            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            const char = text[i];

            if (char === '\\') {
                escapeNext = true;
            } else if ((char === '"' || char === "'") && !escapeNext) {
                inString = !inString;
            } else {
                escapeNext = false;
            }
        }

        return inString;
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StringBoundaryFinder;
} else if (typeof window !== 'undefined') {
    window.StringBoundaryFinder = StringBoundaryFinder;
}