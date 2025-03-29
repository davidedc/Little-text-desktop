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
        console.log("[DEBUG] insert - cursor:", cursor ? `row:${cursor.row}, col:${cursor.col}` : "null", "string:", string);
        
        // Ensure cursor exists
        if (!cursor) {
            console.error("[ERROR] insert - cursor is null or undefined");
            return;
        }
        
        const row = cursor.row;
        const col = cursor.col;
        
        // Debug for specific issues
        console.log("[DEBUG] insert - buffer.lines:", this.lines ? `length:${this.lines.length}` : "null");
        
        // Ensure the row exists in the buffer
        while (row >= this.lines.length) {
            this.lines.push("");
        }
        
        // Get the current line (now guaranteed to exist)
        let current = this.lines[row];
        console.log("[DEBUG] insert - current line:", current);
        
        // Ensure current is a string (defensive programming)
        if (typeof current !== 'string') {
            console.error("[ERROR] insert - current line is not a string:", current);
            current = "";
            this.lines[row] = current;
        }
        
        const safeCol = clamp(col, 0, current.length);
        const newLine = current.slice(0, safeCol) + string + current.slice(safeCol);
        this.lines[row] = newLine;
        console.log("[DEBUG] insert - success, new line:", newLine);
    }

    split(cursor) {
        const row = cursor.row;
        const col = cursor.col;
        
        // Ensure the row exists in the buffer
        if (row >= this.lines.length) {
            this.lines.push("");
            return;
        }
        
        // Get the current line
        let current = this.lines[row];
        
        // Ensure current is a string (defensive programming)
        if (typeof current !== 'string') {
            current = "";
            this.lines[row] = current;
        }
        
        const safeCol = clamp(col, 0, current.length);
        const before = current.slice(0, safeCol);
        const after = current.slice(safeCol);
        this.lines[row] = before;
        this.lines.splice(row + 1, 0, after);
    }

    delete(cursor) {
        const row = cursor.row;
        const col = cursor.col;
        
        // Check bounds
        if (row > this.bottom || (row === this.bottom && col >= this.getLine(row).length)) {
            return;
        }
        
        // Get the current line
        let current = this.lines[row];
        
        // Ensure current is a string (defensive programming)
        if (typeof current !== 'string') {
            current = "";
            this.lines[row] = current;
            return;
        }
        
        if (col < current.length) {
            // Delete character from current line
            const newLine = current.slice(0, col) + current.slice(col + 1);
            this.lines[row] = newLine;
        } else if (row < this.bottom) {
            // Join current line with next line
            let nextLine = this.lines.splice(row + 1, 1)[0] || "";
            // Ensure nextLine is a string
            if (typeof nextLine !== 'string') {
                nextLine = "";
            }
            this.lines[row] = current + nextLine;
        }
    }

    get maxLineLength() {
        return this.lines.reduce((max, line) => Math.max(max, line.length), 0);
    }
}