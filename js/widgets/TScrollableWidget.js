/**
 * TScrollableWidget - Base class for widgets that support scrolling
 * 
 * This class extends TWidget and provides common scrolling functionality
 * including scrollbar rendering, calculation, and interaction handling.
 */
class TScrollableWidget extends TWidget {
    constructor(x, y, w, h, title) {
        super(x, y, w, h, title);
        
        // Debug flag - disabled to reduce logging
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
        // Always get the current scroll position first
        const currentPosition = this.getVerticalScrollPosition();
        
        this.debugLog("Checking vertical scrollbar, current position:", currentPosition);
        
        // If we're scrolled, we need a scrollbar regardless of content size
        if (currentPosition > 0) {
            this.debugLog("Content is scrolled, definitely need scrollbar");
            // Proceed with scrollbar calculation
        } else {
            // Otherwise, check content dimensions
            const dims = this.getContentDimensions();
            if (!dims || !dims.vScrollNeeded) {
                this.debugLog("Vertical scrollbar not needed by dimensions check");
                this.debugLog("Dimensions:", dims);
                return null;
            }
        }

        const dims = this.getContentDimensions();
        const trackSize = dims.contentHeight;
        const totalLines = this.getVerticalContentSize();
        const visibleLines = trackSize;
        
        this.debugLog("SCROLLBAR CHECK - trackSize:", trackSize, "totalLines:", totalLines, 
                     "visibleLines:", visibleLines, "currentPosition:", currentPosition);

        // IMPORTANT: Force scrollbar visibility when scrolled, even if content would now fit
        // This is the key to fixing the issue where scrollbar disappears when content fits
        // but is still scrolled out of view
        const scrollNeeded = totalLines > visibleLines || currentPosition > 0;
        
        this.debugLog("Scroll needed?", scrollNeeded, 
                     "totalLines > visibleLines:", totalLines > visibleLines,
                     "currentPosition > 0:", currentPosition > 0);
        
        if (!scrollNeeded) {
            this.debugLog("Content fits in viewport and is not scrolled, no scrollbar needed");
            return null;
        }

        const thumbSize = Math.max(1, Math.floor(trackSize * visibleLines / Math.max(totalLines, visibleLines + currentPosition)));
        const maxThumbPos = trackSize - thumbSize;
        const thumbPos = Math.min(maxThumbPos, Math.floor(trackSize * currentPosition / Math.max(totalLines, visibleLines + currentPosition)));
        const maxScrollOffset = Math.max(0, totalLines - visibleLines, currentPosition);

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
        // Always get the current scroll position first
        const currentPosition = this.getHorizontalScrollPosition();
        
        this.debugLog("Checking horizontal scrollbar, current position:", currentPosition);
        
        // If we're scrolled, we need a scrollbar regardless of content size
        if (currentPosition > 0) {
            this.debugLog("Content is horizontally scrolled, definitely need scrollbar");
            // Proceed with scrollbar calculation
        } else {
            // Otherwise, check content dimensions
            const dims = this.getContentDimensions();
            if (!dims || !dims.hScrollNeeded) {
                this.debugLog("Horizontal scrollbar not needed by dimensions check");
                return null;
            }
        }

        const dims = this.getContentDimensions();
        const trackSize = dims.contentWidth;
        const totalCols = this.getHorizontalContentSize();
        const visibleCols = trackSize;
        
        this.debugLog("HSCROLLBAR CHECK - trackSize:", trackSize, "totalCols:", totalCols, 
                     "visibleCols:", visibleCols, "currentPosition:", currentPosition);

        // IMPORTANT: Force scrollbar visibility when scrolled, even if content would now fit
        // This is the key to fixing the issue where scrollbar disappears when content fits
        // but is still scrolled out of view
        const scrollNeeded = totalCols > visibleCols || currentPosition > 0;
        
        this.debugLog("H-Scroll needed?", scrollNeeded, 
                     "totalCols > visibleCols:", totalCols > visibleCols,
                     "currentPosition > 0:", currentPosition > 0);
        
        if (!scrollNeeded) {
            this.debugLog("Content fits in viewport horizontally and is not scrolled, no scrollbar needed");
            return null;
        }

        const thumbSize = Math.max(1, Math.floor(trackSize * visibleCols / Math.max(totalCols, visibleCols + currentPosition)));
        const maxThumbPos = trackSize - thumbSize;
        const thumbPos = Math.min(maxThumbPos, Math.floor(trackSize * currentPosition / Math.max(totalCols, visibleCols + currentPosition)));
        const maxScrollOffset = Math.max(0, totalCols - visibleCols, currentPosition);

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
        const currentPos = this.getVerticalScrollPosition();
        
        // Allow scrolling in either direction if we're not at the top/bottom
        if (currentPos > 0 || delta > 0) {
            const totalSize = this.getVerticalContentSize();
            const dims = this.getContentDimensions();
            const visibleLines = dims ? dims.contentHeight : 0;
            
            // Calculate new position
            const newOffset = currentPos + Math.sign(delta);
            
            // Only allow scrolling within valid range
            if (newOffset >= 0 && (delta < 0 || newOffset < totalSize)) {
                this.debugLog("Scrolling with delta:", delta, "new offset:", newOffset);
                const changed = this.setVerticalScrollPosition(newOffset);
                if (changed) {
                    drawTWidgets();
                }
                return true;
            }
        }
        
        // If we have scroll info (scrollbar is visible), use standard scrolling
        const info = this.getVerticalScrollbarInfo();
        if (info) {
            const newOffset = currentPos + Math.sign(delta);
            this.debugLog("Scroll with scrollbar, delta:", delta, "new offset:", newOffset);
            const changed = this.updateScrollOffset('vertical', newOffset);
            if (changed) {
                drawTWidgets();
            }
            return changed;
        }
        
        return false;
    }

    /**
     * Draw scrollbars if needed
     * @param {Array} charGrid Character grid to draw on
     * @param {Object} dims Content dimensions from getContentDimensions()
     */
    drawScrollbars(charGrid, dims) {
        this.debugLog("Drawing scrollbars - vScrollNeeded:", dims.vScrollNeeded, 
                     "hScrollNeeded:", dims.hScrollNeeded);
        
        // Draw vertical scrollbar if needed
        if (dims.vScrollNeeded) {
            const scrollInfo = this.getVerticalScrollbarInfo();
            if (scrollInfo) {
                this.debugLog("Drawing vertical scrollbar, info:", scrollInfo);
                // Draw vertical track and thumb
                for (let pos = 0; pos < scrollInfo.trackSize; pos++) {
                    const isThumb = (pos >= scrollInfo.thumbPosition && 
                                   pos < scrollInfo.thumbPosition + scrollInfo.thumbSize);
                    const char = isThumb ? '#' : '│';
                    setChar(charGrid, this.x + this.w - 2, this.y + 1 + pos, char);
                }
            } else {
                this.debugLog("Vertical scrollbar needed but getVerticalScrollbarInfo returned null");
            }
        }

        // Draw horizontal scrollbar if needed  
        if (dims.hScrollNeeded) {
            const scrollInfo = this.getHorizontalScrollbarInfo();
            if (scrollInfo) {
                this.debugLog("Drawing horizontal scrollbar, info:", scrollInfo);
                // Draw horizontal track and thumb
                for (let pos = 0; pos < scrollInfo.trackSize; pos++) {
                    const isThumb = (pos >= scrollInfo.thumbPosition && 
                                   pos < scrollInfo.thumbPosition + scrollInfo.thumbSize);
                    const char = isThumb ? '#' : '─';
                    setChar(charGrid, this.x + 1 + pos, this.y + this.h - 2, char);
                }
            } else {
                this.debugLog("Horizontal scrollbar needed but getHorizontalScrollbarInfo returned null");
            }
        }

        // Draw scrollbar corner intersection if both scrollbars present
        if (dims.vScrollNeeded && dims.hScrollNeeded) {
            setChar(charGrid, this.x + this.w - 2, this.y + this.h - 2, '+');
        }
    }
}