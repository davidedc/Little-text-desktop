class EditorCursor {
    constructor(row = 0, col = 0, col_hint = null) {
        this._row = row;
        this._col = col;
        this._col_hint = col_hint === null ? col : col_hint;
    }
    // Row position getter/setter
    get row() { 
        return this._row; 
    }
    set row(newRow) { 
        this._row = newRow; 
    }

    // Column position getter/setter 
    get col() { 
        return this._col; 
    }
    set col(newCol) { 
        this._col = newCol;
        this._col_hint = newCol;
    }

    // Clamp column position based on line length
    _clamp_col(buffer) {
        const lineLength = buffer.getLine(this.row).length;
        this._col = clamp(this._col_hint, 0, lineLength);
    }

    // Move cursor up one row if possible
    up(buffer) {
        if (this.row > 0) {
            this.row -= 1;
            this._clamp_col(buffer);
        }
    }

    // Move cursor down one row if possible
    down(buffer) {
        if (this.row < buffer.length) {
            this.row += 1;
            if (this.row > buffer.bottom) {
                this.row = buffer.bottom;
            }
            this._clamp_col(buffer);
        }
    }

    // Move cursor left one column, or to end of previous line
    left(buffer) {
        if (this.col > 0) {
            this.col -= 1;
        } else if (this.row > 0) {
            this.row -= 1;
            this.col = buffer.getLine(this.row).length;
        }
    }

    // Move cursor right one column, or to start of next line  
    right(buffer) {
        const currentLineLength = buffer.getLine(this.row).length;
        if (this.col < currentLineLength) {
            this.col += 1;
        } else if (this.row < buffer.bottom) {
            this.row += 1;
            this.col = 0;
        }
    }
}