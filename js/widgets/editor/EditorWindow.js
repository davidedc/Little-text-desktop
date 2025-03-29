class EditorWindow {
    // Initialize editor window with dimensions and position
    constructor(rows, cols, startRow = 0, startCol = 0) {
        this.n_rows = rows;     // Number of rows in the window
        this.n_cols = cols;     // Number of columns in the window
        this.row = startRow;    // Starting row position (scroll offset)
        this.col = startCol;    // Starting column position (scroll offset)
        
        // Debug logging disabled
        this.debug = false;
    }
    
    // Log debug information
    log(...args) {
        if (this.debug) {
            console.log("[EditorWindow]", ...args);
        }
    }

    // Get the bottom-most row number of the window
    get bottom() {
        return this.row + this.n_rows - 1;
    }

    // Scroll window up if cursor moves above window
    up(cursor) {
        this.log("up check - cursor.row:", cursor.row, "window.row:", this.row);
        if (cursor.row < this.row) {
            this.log("Scrolling window up to", cursor.row);
            this.row = cursor.row;
        }
    }

    // Scroll window down if cursor moves below window
    down(buffer, cursor) {
        this.log("down check - cursor.row:", cursor.row, "window.bottom:", this.bottom);
        
        if (cursor.row > this.bottom) {
            const newRow = cursor.row - this.n_rows + 1;
            this.log("Scrolling window down to", newRow);
            this.row = newRow;
        } else {
            // If we're scrolled down and content was deleted,
            // check if we need to keep some scroll position
            if (this.row > 0) {
                // Calculate if all content would now fit in viewport
                const totalContent = buffer.length;
                const viewportSize = this.n_rows;
                
                this.log("Scroll position check - row:", this.row, 
                         "totalContent:", totalContent, 
                         "viewportSize:", viewportSize);
                
                // If total content is less than viewport plus current scroll,
                // adjust scroll position to show all content
                if (totalContent <= viewportSize && this.row > 0) {
                    // Only adjust if necessary to show all content
                    if (totalContent > 0 && this.row > totalContent - 1) {
                        const newRow = Math.max(0, totalContent - viewportSize);
                        this.log("Adjusting scroll to show all content:", newRow);
                        this.row = newRow;
                    }
                }
            }
        }
    }

    // Handle horizontal scrolling to keep cursor in view
    horizontal_scroll(cursor, leftMargin = 5, rightMargin = 2) {
        const windowWidth = this.n_cols;
        if (cursor.col < this.col + leftMargin) {
            this.col = Math.max(0, cursor.col - leftMargin);
        } else if (cursor.col >= this.col + windowWidth - rightMargin) {
            this.col = cursor.col - windowWidth + rightMargin + 1;
        }
        this.col = Math.max(0, this.col);
    }

    // Convert cursor position to coordinates relative to window
    translate(cursor) {
        return {
            rel_row: cursor.row - this.row,  // Row position relative to window
            rel_col: cursor.col - this.col   // Column position relative to window
        };
    }
}