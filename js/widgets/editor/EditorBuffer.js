/**
 * Represents the text buffer holding the editor's content.
 */
class EditorBuffer {
    constructor(lines) {
        this.lines = lines || [""];
        this.lines = this.lines.map(line => String(line));
    }

    get length() {
        return this.lines.length;
    }

    get bottom() {
        return Math.max(0, this.lines.length - 1);
    }

    getLine(index) {
        return this.lines[index] || "";
    }

    insert(cursor, string) {
        const row = cursor.row;
        const col = cursor.col;
        while (row >= this.lines.length) {
            this.lines.push("");
        }
        let current = this.lines[row];
        const safeCol = clamp(col, 0, current.length);
        const newLine = current.slice(0, safeCol) + string + current.slice(safeCol);
        this.lines[row] = newLine;
    }

    split(cursor) {
        const row = cursor.row;
        const col = cursor.col;
        if (row >= this.lines.length) {
            this.lines.push("");
            return;
        }
        let current = this.lines[row];
        const safeCol = clamp(col, 0, current.length);
        const before = current.slice(0, safeCol);
        const after = current.slice(safeCol);
        this.lines[row] = before;
        this.lines.splice(row + 1, 0, after);
    }

    delete(cursor) {
        const row = cursor.row;
        const col = cursor.col;
        
        // Log buffer state before delete
        console.log("[EditorBuffer] Delete at", row, col, 
                   "Buffer size before:", this.lines.length,
                   "Max line length:", this.maxLineLength);
        
        if (row > this.bottom || (row === this.bottom && col >= this.getLine(row).length)) {
            console.log("[EditorBuffer] Delete not valid - out of bounds");
            return;
        }
        
        let current = this.lines[row];
        if (col < current.length) {
            // Delete character from current line
            const newLine = current.slice(0, col) + current.slice(col + 1);
            this.lines[row] = newLine;
            console.log("[EditorBuffer] Deleted character from line", row);
        } else if (row < this.bottom) {
            // Join current line with next line
            const nextLine = this.lines.splice(row + 1, 1)[0];
            this.lines[row] = current + nextLine;
            console.log("[EditorBuffer] Joined line", row, "with line", row + 1);
        }
        
        // Log buffer state after delete
        console.log("[EditorBuffer] Buffer size after:", this.lines.length,
                   "Max line length:", this.maxLineLength);
    }

    get maxLineLength() {
        return this.lines.reduce((max, line) => Math.max(max, line.length), 0);
    }
}