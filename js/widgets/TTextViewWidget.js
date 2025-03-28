// TTextViewWidget: Displays scrollable text content
class TTextViewWidget extends TScrollableWidget {
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
            this.debugLog("Updated lines cache, now", this.linesCache.length, "lines");
        }
    }

    clearContents(charGrid) {
        const dimensions = this.getContentDimensions();
        for (let rowIndex = this.y + 1; rowIndex < this.y + 1 + dimensions.contentHeight; rowIndex++) {
            for (let colIndex = this.x + 1; colIndex < this.x + 1 + dimensions.contentWidth; colIndex++) {
                if (rowIndex < GRID_HEIGHT_chars && colIndex < GRID_WIDTH_chars) {
                    setChar(charGrid, colIndex, rowIndex, ' ');
                }
            }
        }
    }

    /**
     * Implementation of TScrollableWidget abstract method
     * Calculate dimensions of text view content area and determine if scrollbars are needed
     */
    getContentDimensions() {
        this._updateLinesCache();
        const maxHeight = Math.max(0, this.h - 2);
        const needsVerticalScroll = this.linesCache.length > maxHeight && 
                                  (this.w - 2 - 1) > 0 && maxHeight > 0;
        const verticalScrollWidth = needsVerticalScroll ? 1 : 0;
        const contentWidth = Math.max(0, this.w - 2 - verticalScrollWidth);
        const contentHeight = maxHeight;

        const result = {
            vScrollNeeded: needsVerticalScroll,
            hScrollNeeded: false, // TextView doesn't support horizontal scrolling
            contentWidth: contentWidth,
            contentHeight: contentHeight
        };
        
        this.debugLog("Content dimensions:", result);
        return result;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get total content size for vertical scrolling
     */
    getVerticalContentSize() {
        return this.linesCache ? this.linesCache.length : 0;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get current vertical scroll position
     */
    getVerticalScrollPosition() {
        return this.scrollOffset;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Set vertical scroll position
     */
    setVerticalScrollPosition(position) {
        if (this.scrollOffset !== position) {
            this.scrollOffset = position;
            return true;
        }
        return false;
    }

    draw_content(charGrid) {
        const dimensions = this.getContentDimensions();
        const lines = this.linesCache;

        if (dimensions.contentWidth <= 0 || dimensions.contentHeight <= 0) return;

        this.debugLog("Drawing text content, scroll offset:", this.scrollOffset);

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

        // Use base class to draw scrollbars
        this.drawScrollbars(charGrid, dimensions);
    }

    updateDimensions(newWidth, newHeight) {
        super.updateDimensions(newWidth, newHeight);
        this.linesCache = null;
        this.lastWidth = null;

        const dimensions = this.getContentDimensions();
        const maxScroll = Math.max(0, (this.linesCache?.length || 0) - dimensions.contentHeight);
        this.scrollOffset = clamp(this.scrollOffset, 0, maxScroll);
        
        this.debugLog("Updated dimensions, new scroll offset:", this.scrollOffset);
    }
    
    // The following methods are now handled by TScrollableWidget
    // We remove these implementations and use the base class versions
}