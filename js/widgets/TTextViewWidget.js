// TTextViewWidget: Displays scrollable text content
class TTextViewWidget extends TWidget {
    constructor(posX, posY, width, height, title, content) {
        super(posX, posY, width, height, title);
        this.content = content;
        this.scrollOffset = 0;
        this.linesCache = null;
        this.lastContent = null;
        this.lastWidth = null;
    }

    _updateLinesCache() {
        const availableWidth = this.w - 2 - SCROLL_BAR_WIDTH_chars;
        if (availableWidth <= 0) {
            this.linesCache = [];
            return;
        }

        if (this.content !== this.lastContent || availableWidth !== this.lastWidth) {
            this.linesCache = wrapText(this.content, availableWidth);
            this.lastContent = this.content;
            this.lastWidth = availableWidth;
        }
    }

    clearContents(charGrid) {
        const dimensions = this._getContentDimensions();
        for (let rowIndex = this.y + 1; rowIndex < this.y + 1 + dimensions.contentHeight; rowIndex++) {
            for (let colIndex = this.x + 1; colIndex < this.x + 1 + dimensions.contentWidth; colIndex++) {
                if (rowIndex < GRID_HEIGHT_chars && colIndex < GRID_WIDTH_chars) {
                    setChar(charGrid, colIndex, rowIndex, ' ');
                }
            }
        }
    }

    _getContentDimensions() {
        this._updateLinesCache();
        const maxHeight = Math.max(0, this.h - 2);
        const needsVerticalScroll = this.linesCache.length > maxHeight && 
                                  (this.w - 2 - 1) > 0 && maxHeight > 0;
        const verticalScrollWidth = needsVerticalScroll ? 1 : 0;
        const contentWidth = Math.max(0, this.w - 2 - verticalScrollWidth);
        const contentHeight = maxHeight;

        return {
            vScrollNeeded: needsVerticalScroll,
            contentWidth: contentWidth,
            contentHeight: contentHeight
        };
    }

    draw_content(charGrid) {
        const dimensions = this._getContentDimensions();
        const lines = this.linesCache;

        if (dimensions.contentWidth <= 0 || dimensions.contentHeight <= 0) return;

        // Draw text content
        for (let rowIndex = 0; rowIndex < dimensions.contentHeight; rowIndex++) {
            const lineIndex = rowIndex + this.scrollOffset;
            const screenY = this.y + 1 + rowIndex;

            if (lineIndex >= 0 && lineIndex < lines.length) {
                const currentLine = lines[lineIndex];
                for (let colIndex = 0; colIndex < dimensions.contentWidth; colIndex++) {
                    const screenX = this.x + 1 + colIndex;
                    const character = colIndex < currentLine.length ? currentLine[colIndex] : ' ';
                    setChar(charGrid, screenX, screenY, character);
                }
            } else {
                for (let colIndex = 0; colIndex < dimensions.contentWidth; colIndex++) {
                    setChar(charGrid, this.x + 1 + colIndex, screenY, ' ');
                }
            }
        }

        // Draw scrollbar if needed
        if (dimensions.vScrollNeeded) {
            this.drawScrollbar(charGrid, lines.length, dimensions.contentHeight);
        }
    }

    drawScrollbar(charGrid, totalLines, viewportHeight) {
        const scrollbarHeight = viewportHeight;
        const scrollbarX = this.x + this.w - 2;

        if (scrollbarHeight <= 0) return;

        const thumbSize = Math.max(1, Math.floor(scrollbarHeight * viewportHeight / totalLines));
        const maxThumbPos = scrollbarHeight - thumbSize;
        const thumbPos = Math.min(maxThumbPos, Math.floor(scrollbarHeight * this.scrollOffset / totalLines));

        for (let posIndex = 0; posIndex < scrollbarHeight; posIndex++) {
            const scrollChar = (posIndex >= thumbPos && posIndex < thumbPos + thumbSize) ? '#' : '│';
            setChar(charGrid, scrollbarX, this.y + 1 + posIndex, scrollChar);
        }
    }

    updateDimensions(newWidth, newHeight) {
        super.updateDimensions(newWidth, newHeight);
        this.linesCache = null;
        this.lastWidth = null;

        const dimensions = this._getContentDimensions();
        const maxScroll = Math.max(0, (this.linesCache?.length || 0) - dimensions.contentHeight);
        this.scrollOffset = clamp(this.scrollOffset, 0, maxScroll);
    }

    getVerticalScrollbarInfo() {
        const dimensions = this._getContentDimensions();
        if (!dimensions.vScrollNeeded) return null;

        const trackSize = dimensions.contentHeight;
        const totalLines = this.linesCache.length;
        const visibleLines = trackSize;
        const thumbSize = Math.max(1, Math.floor(trackSize * visibleLines / totalLines));
        const maxThumbPos = trackSize - thumbSize;
        const thumbPos = Math.min(maxThumbPos, Math.floor(trackSize * this.scrollOffset / totalLines));
        const maxScrollOffset = totalLines - visibleLines;

        return {
            trackSize,
            thumbSize,
            thumbPosition: thumbPos,
            totalLines,
            visibleLines,
            maxScrollOffset
        };
    }

    updateScrollOffset(axis, newOffset) {
        if (axis === 'vertical') {
            const info = this.getVerticalScrollbarInfo();
            if (info) {
                const clampedOffset = clamp(Math.round(newOffset), 0, info.maxScrollOffset);
                if (this.scrollOffset !== clampedOffset) {
                    this.scrollOffset = clampedOffset;
                    return true;
                }
            }
        }
        return false;
    }

    scroll(delta) {
        const info = this.getVerticalScrollbarInfo();
        if (!info) return false;

        const newOffset = this.scrollOffset + Math.sign(delta);
        const changed = this.updateScrollOffset('vertical', newOffset);
        if (changed) {
            drawTWidgets();
        }
        return changed;
    }
}