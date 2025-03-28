class EditorWindow {
    // Initialize editor window with dimensions and position
    constructor(rows, cols, startRow = 0, startCol = 0) {
        this.n_rows = rows;     // Number of rows in the window
        this.n_cols = cols;     // Number of columns in the window
        this.row = startRow;    // Starting row position (scroll offset)
        this.col = startCol;    // Starting column position (scroll offset)
    }

    // Get the bottom-most row number of the window
    get bottom() {
        return this.row + this.n_rows - 1;
    }

    // Scroll window up if cursor moves above window
    up(cursor) {
        if (cursor.row < this.row) {
            this.row = cursor.row;
        }
    }

    // Scroll window down if cursor moves below window
    down(buffer, cursor) {
        if (cursor.row > this.bottom) {
            this.row = cursor.row - this.n_rows + 1;
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