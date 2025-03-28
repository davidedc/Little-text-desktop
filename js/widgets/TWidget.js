/**
 * Base class for all ASCII widgets.
 */
class TWidget {
    constructor(x, y, w, h, title) {
        // Note: We're keeping short property names (x, y, w, h) because they're used
        // extensively throughout the codebase as standard coordinates terminology
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.title = title;
        this.hasFocus = false;
    }

    destroy() {
        // Find and remove this widget from the global tWidgets array
        const i = tWidgets.indexOf(this);
        if (i > -1) {
            tWidgets.splice(i, 1);
        }

        // Clear active widget reference if it was this widget
        if (activeWidget === this) {
            activeWidget = null;
        }
    }

    // Set focus state to true when widget gains focus
    gainFocus() {
        this.hasFocus = true;
    }

    // Set focus state to false when widget loses focus  
    loseFocus() {
        this.hasFocus = false;
    }

    // Handle keyboard events, returns false by default
    handleKeyPress(e) {
        return false;
    }

    // Handle scroll events, returns false by default
    scroll(scrollDelta) {
        return false;
    }

    // Handle click events at coordinates (x,y)
    click(x, y) {
        // Default empty implementation
    }

    clearContents(charGrid) {
        const contentWidth = this.w - 2;
        const contentHeight = this.h - 2;
        for (let rowIndex = this.y + 1; rowIndex < this.y + 1 + contentHeight; rowIndex++) {
            for (let colIndex = this.x + 1; colIndex < this.x + 1 + contentWidth; colIndex++) {
                if (rowIndex < GRID_HEIGHT_chars && colIndex < GRID_WIDTH_chars) {
                    setChar(charGrid, colIndex, rowIndex, ' ');
                }
            }
        }
    }

    // Draw the bottom border of the widget using '─' characters
    draw_bottomBorder(charGrid) {
        for (let colIndex = this.x; colIndex < this.x + this.w; colIndex++) {
            setChar(charGrid, colIndex, this.y + this.h - 1, '─');
        }
    }

    // Draw the top border of the widget using '─' characters
    draw_topBorder(charGrid) {
        for (let colIndex = this.x; colIndex < this.x + this.w; colIndex++) {
            setChar(charGrid, colIndex, this.y, '─');
        }
    }

    // Draw the left border of the widget using '│' characters
    draw_leftBorder(charGrid) {
        for (let rowIndex = this.y + 1; rowIndex < this.y + this.h - 1; rowIndex++) {
            setChar(charGrid, this.x, rowIndex, '│');
        }
    }

    // Draw the right border of the widget using '│' characters
    draw_rightBorder(charGrid) {
        for (let rowIndex = this.y + 1; rowIndex < this.y + this.h - 1; rowIndex++) {
            setChar(charGrid, this.x + this.w - 1, rowIndex, '│');
        }
    }

    // Draw the corner characters ('┌', '┐', '└') of the widget
    draw_corners(charGrid) {
        setChar(charGrid, this.x, this.y, '┌');
        setChar(charGrid, this.x + this.w - 1, this.y, '┐');
        setChar(charGrid, this.x, this.y + this.h - 1, '└');
    }

    // Draw the widget title, truncating if it exceeds available space
    draw_title(charGrid) {
        const maxTitleLen = this.w - 4;
        const titleStr = this.title.substring(0, Math.max(0, maxTitleLen));
        for (let charIndex = 0; charIndex < titleStr.length; charIndex++) {
            setChar(charGrid, this.x + 1 + charIndex, this.y, titleStr[charIndex]);
        }
    }

    // Draw the close button ('X') if widget is wide enough
    draw_close_button(charGrid) {
        if (this.w >= 4) {
            setChar(charGrid, this.x + this.w - 2, this.y, Cell.closeButton());
        }
    }

    // Draw the resize handle ('◢') in bottom-right corner if widget has positive dimensions
    draw_resizerHandle(charGrid) {
        if (this.w > 0 && this.h > 0) {
            setChar(charGrid, this.x + this.w - 1, this.y + this.h - 1, Cell.resizeHandle());
        }
    }

    // Placeholder for widget-specific content drawing
    draw_content(charGrid) { } // Overridden by subclasses

    draw(charGrid, isTopWidget = false) {
        this.draw_shadow(charGrid, isTopWidget);
        // Draw the horizontal borders (top and bottom)
        this.draw_topBorder(charGrid);
        this.draw_bottomBorder(charGrid);
        
        // Draw the vertical borders (left and right) 
        this.draw_leftBorder(charGrid);
        this.draw_rightBorder(charGrid);
        this.draw_corners(charGrid);
        this.draw_title(charGrid);
        this.draw_close_button(charGrid);
        this.draw_resizerHandle(charGrid);
        this.clearContents(charGrid);
        this.draw_content(charGrid);
    }

    // Draw a shadow effect for the widget using shading characters
    draw_shadow(charGrid, isTopWidget) {
        // Choose shadow intensity based on whether widget is on top
        const shadowChar = isTopWidget ? MEDIUM_SHADE : LIGHT_SHADE;
        
        // Draw bottom shadow if within grid bounds
        const bottomEdgeY = this.y + this.h;
        if (bottomEdgeY < GRID_HEIGHT_chars) {
            for (let colIndex = this.x + 1; colIndex < this.x + this.w + 1 && colIndex < GRID_WIDTH_chars; colIndex++) {
                setChar(charGrid, colIndex, bottomEdgeY, shadowChar);
            }
        }
        
        // Draw right shadow if within grid bounds
        const rightEdgeX = this.x + this.w;
        if (rightEdgeX < GRID_WIDTH_chars) {
            for (let rowIndex = this.y + 1; rowIndex < this.y + this.h && rowIndex < GRID_HEIGHT_chars; rowIndex++) {
                setChar(charGrid, rightEdgeX, rowIndex, shadowChar);
            }
        }
    }

    // Update widget dimensions
    updateDimensions(newWidth, newHeight) {
        this.w = newWidth;
        this.h = newHeight;
    }

    // Scrollbar information methods - defaults to no scrollbars
    getVerticalScrollbarInfo() {
        return null; // Default: no scrollbar
    }

    getHorizontalScrollbarInfo() {
        return null; // Default: no scrollbar
    }

    // Update scroll position - default implementation does nothing
    updateScrollOffset(axis, newOffset) {
        return false; // Default: no change
    }
}