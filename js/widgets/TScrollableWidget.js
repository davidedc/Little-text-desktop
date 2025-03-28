/**
 * TScrollableWidget - Base class for widgets that support scrolling
 * 
 * This class extends TWidget and provides common scrolling functionality
 * including scrollbar rendering, calculation, and interaction handling.
 */
class TScrollableWidget extends TWidget {
    constructor(x, y, w, h, title) {
        super(x, y, w, h, title);
        
        // Debug flag - set to true to log scrolling operations
        this.debugScrolling = false;
    }

    /**
     * Log debug information if debugging is enabled
     */
    debugLog(...args) {
        if (this.debugScrolling) {
            console.log(`[${this.constructor.name}]`, ...args);
        }
    }

    /**
     * Calculate dimensions for content area and determine if scrollbars are needed
     * This is an abstract method that must be implemented by subclasses
     * @returns {Object} Object containing content dimensions and scrollbar needs
     */
    getContentDimensions() {
        throw new Error("TScrollableWidget subclasses must implement getContentDimensions");
    }

    /**
     * Get total content size for vertical scrolling
     * This is an abstract method that must be implemented by subclasses
     * @returns {number} Total content size (e.g., number of lines)
     */
    getVerticalContentSize() {
        throw new Error("TScrollableWidget subclasses must implement getVerticalContentSize");
    }

    /**
     * Get total content size for horizontal scrolling
     * This is an abstract method that must be implemented by subclasses
     * @returns {number} Total content size (e.g., maximum line width)
     */
    getHorizontalContentSize() {
        return 0; // Default implementation - no horizontal scrolling
    }

    /**
     * Get current vertical scroll position
     * This is an abstract method that must be implemented by subclasses
     * @returns {number} Current vertical scroll position
     */
    getVerticalScrollPosition() {
        throw new Error("TScrollableWidget subclasses must implement getVerticalScrollPosition");
    }

    /**
     * Get current horizontal scroll position
     * This is an abstract method that must be implemented by subclasses
     * @returns {number} Current horizontal scroll position
     */
    getHorizontalScrollPosition() {
        return 0; // Default implementation - no horizontal scrolling
    }

    /**
     * Set vertical scroll position
     * This is an abstract method that must be implemented by subclasses
     * @param {number} position New vertical scroll position
     * @returns {boolean} True if the position changed, false otherwise
     */
    setVerticalScrollPosition(position) {
        throw new Error("TScrollableWidget subclasses must implement setVerticalScrollPosition");
    }

    /**
     * Set horizontal scroll position
     * This is an abstract method that must be implemented by subclasses
     * @param {number} position New horizontal scroll position
     * @returns {boolean} True if the position changed, false otherwise
     */
    setHorizontalScrollPosition(position) {
        return false; // Default implementation - no horizontal scrolling
    }

    /**
     * Calculate information needed to render vertical scrollbar
     * @returns {Object|null} Scrollbar information or null if scrollbar not needed
     */
    getVerticalScrollbarInfo() {
        const dims = this.getContentDimensions();
        if (!dims || !dims.vScrollNeeded) {
            this.debugLog("Vertical scrollbar not needed");
            return null;
        }

        const trackSize = dims.contentHeight;
        const totalLines = this.getVerticalContentSize();
        const visibleLines = trackSize;

        // Handle edge case where content is smaller than viewport
        if (totalLines <= visibleLines) {
            this.debugLog("Content fits in viewport, no scrollbar needed");
            return null;
        }

        const thumbSize = Math.max(1, Math.floor(trackSize * visibleLines / totalLines));
        const maxThumbPos = trackSize - thumbSize;
        const currentPosition = this.getVerticalScrollPosition();
        const thumbPos = Math.min(maxThumbPos, Math.floor(trackSize * currentPosition / totalLines));
        const maxScrollOffset = totalLines - visibleLines;

        const info = {
            trackSize,
            thumbSize,
            thumbPosition: thumbPos,
            totalLines,
            visibleLines,
            maxScrollOffset
        };
        
        this.debugLog("Vertical scrollbar info:", info);
        return info;
    }

    /**
     * Calculate information needed to render horizontal scrollbar
     * @returns {Object|null} Scrollbar information or null if scrollbar not needed
     */
    getHorizontalScrollbarInfo() {
        const dims = this.getContentDimensions();
        if (!dims || !dims.hScrollNeeded) {
            return null;
        }

        const trackSize = dims.contentWidth;
        const totalCols = this.getHorizontalContentSize();
        const visibleCols = trackSize;

        // Handle edge case where content is smaller than viewport
        if (totalCols <= visibleCols) {
            return null;
        }

        const thumbSize = Math.max(1, Math.floor(trackSize * visibleCols / totalCols));
        const maxThumbPos = trackSize - thumbSize;
        const currentPosition = this.getHorizontalScrollPosition();
        const thumbPos = Math.min(maxThumbPos, Math.floor(trackSize * currentPosition / totalCols));
        const maxScrollOffset = totalCols - visibleCols;

        return {
            trackSize,
            thumbSize,
            thumbPosition: thumbPos,
            totalCols,
            visibleCols,
            maxScrollOffset
        };
    }

    /**
     * Update scroll position for vertical or horizontal scrolling
     * @param {string} axis Scroll axis: 'vertical' or 'horizontal'
     * @param {number} newOffset New scroll position
     * @returns {boolean} True if the position changed, false otherwise
     */
    updateScrollOffset(axis, newOffset) {
        let changed = false;
        
        if (axis === 'vertical') {
            const info = this.getVerticalScrollbarInfo();
            if (info) {
                const clampedOffset = clamp(Math.round(newOffset), 0, info.maxScrollOffset);
                this.debugLog(`Updating vertical scroll to ${clampedOffset} (requested: ${newOffset})`);
                changed = this.setVerticalScrollPosition(clampedOffset);
            }
        }
        else if (axis === 'horizontal') {
            const info = this.getHorizontalScrollbarInfo();
            if (info) {
                const clampedOffset = clamp(Math.round(newOffset), 0, info.maxScrollOffset);
                this.debugLog(`Updating horizontal scroll to ${clampedOffset} (requested: ${newOffset})`);
                changed = this.setHorizontalScrollPosition(clampedOffset);
            }
        }

        return changed;
    }

    /**
     * Handle mouse wheel scrolling
     * @param {number} delta Scroll delta
     * @returns {boolean} True if scroll position changed, false otherwise
     */
    scroll(delta) {
        const info = this.getVerticalScrollbarInfo();
        
        // Special case: allow scrolling down even without scrollbar if there's content below
        if (!info && delta > 0) {
            const totalSize = this.getVerticalContentSize();
            const currentPos = this.getVerticalScrollPosition();
            
            if (totalSize > 0 && currentPos < totalSize - 1) {
                this.debugLog("Scrolling without scrollbar, delta:", delta);
                const changed = this.updateScrollOffset('vertical', currentPos + 1);
                if (changed) {
                    drawTWidgets();
                }
                return true;
            }
            return false;
        }

        // No scrolling if no scrollbar
        if (!info) return false;

        const newOffset = this.getVerticalScrollPosition() + Math.sign(delta);
        this.debugLog("Scroll with delta:", delta, "new offset:", newOffset);
        const changed = this.updateScrollOffset('vertical', newOffset);
        if (changed) {
            drawTWidgets();
        }
        return changed;
    }

    /**
     * Draw scrollbars if needed
     * @param {Array} charGrid Character grid to draw on
     * @param {Object} dims Content dimensions from getContentDimensions()
     */
    drawScrollbars(charGrid, dims) {
        // Draw vertical scrollbar if needed
        if (dims.vScrollNeeded) {
            const scrollInfo = this.getVerticalScrollbarInfo();
            if (scrollInfo) {
                // Draw vertical track and thumb
                for (let pos = 0; pos < scrollInfo.trackSize; pos++) {
                    const isThumb = (pos >= scrollInfo.thumbPosition && 
                                   pos < scrollInfo.thumbPosition + scrollInfo.thumbSize);
                    const char = isThumb ? '#' : '│';
                    setChar(charGrid, this.x + this.w - 2, this.y + 1 + pos, char);
                }
            }
        }

        // Draw horizontal scrollbar if needed  
        if (dims.hScrollNeeded) {
            const scrollInfo = this.getHorizontalScrollbarInfo();
            if (scrollInfo) {
                // Draw horizontal track and thumb
                for (let pos = 0; pos < scrollInfo.trackSize; pos++) {
                    const isThumb = (pos >= scrollInfo.thumbPosition && 
                                   pos < scrollInfo.thumbPosition + scrollInfo.thumbSize);
                    const char = isThumb ? '#' : '─';
                    setChar(charGrid, this.x + 1 + pos, this.y + this.h - 2, char);
                }
            }
        }

        // Draw scrollbar corner intersection if both scrollbars present
        if (dims.vScrollNeeded && dims.hScrollNeeded) {
            setChar(charGrid, this.x + this.w - 2, this.y + this.h - 2, '+');
        }
    }
}