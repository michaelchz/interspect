class StringBoundaryFinder {
    /**
     * 预扫描字符串，返回所有字符串区间
     * @param {string} text
     * @returns {Array<{start:number,end:number,quote:string}>}
     */
    static _scanStrings(text) {
        const ranges = [];
        let inString = false;
        let quoteChar = null;
        let start = -1;
        let escapeNext = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (c === "\\") {
                escapeNext = true;
            } else if (c === '"' || c === "'") {
                if (!inString) {
                    inString = true;
                    quoteChar = c;
                    start = i;
                } else if (c === quoteChar) {
                    ranges.push({ start, end: i + 1, quote: quoteChar });
                    inString = false;
                    quoteChar = null;
                }
            }
        }

        return ranges;
    }

    /**
     * 查找字符串边界
     */
    static findStringBoundary(text, position, findStart) {
        if (typeof text !== "string" || position < 0 || position > text.length) {
            return findStart ? 0 : text.length;
        }
        if (text.length === 0) return 0;

        const ranges = this._scanStrings(text);

        for (const r of ranges) {
            if (position >= r.start && position <= r.end) {
                return findStart ? r.start : r.end;
            }
        }

        // 不在任何字符串里
        return findStart ? 0 : text.length;
    }

    /**
     * 获取字符串片段（包含引号）
     */
    static getStringFragment(text, start, end) {
        const ranges = this._scanStrings(text);
        for (const r of ranges) {
            if (start >= r.start && end <= r.end) {
                return text.substring(r.start, r.end);
            }
        }
        return "";
    }

    /**
     * 查找所有字符串
     */
    static findAllStrings(text) {
        return this._scanStrings(text).map(r => ({
            start: r.start,
            end: r.end,
            value: text.substring(r.start, r.end),
        }));
    }

    /**
     * 判断位置是否在字符串内
     */
    static isInsideString(text, position) {
        const ranges = this._scanStrings(text);
        return ranges.some(r => position >= r.start && position < r.end);
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StringBoundaryFinder;
} else if (typeof window !== 'undefined') {
    window.StringBoundaryFinder = StringBoundaryFinder;
}