/**
 * EditorSelection - Manages text selection state and operations
 * 
 * This class handles tracking selection range, manipulating the selection,
 * and providing helper methods for rendering and editing selected text.
 */
class EditorSelection {
    constructor() {
        this.active = false;      // Whether selection is active
        this.startRow = 0;        // Starting row of selection
        this.startCol = 0;        // Starting column of selection
        this.endRow = 0;          // Ending row of selection
        this.endCol = 0;          // Ending column of selection
        this.debug = true;        // Enable debug logging
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            // Only log when specifically requested
            if (args[0] === "IMPORTANT") {
                console.log("[EditorSelection]", ...args.slice(1));
            }
        }
    }

    /**
     * Start a new selection at the given position
     * @param {number} row - Starting row
     * @param {number} col - Starting column
     */
    start(row, col) {
        this.active = true;
        this.startRow = row;
        this.startCol = col;
        this.endRow = row;
        this.endCol = col;
        this.log("Started selection at", row, col);
    }

    /**
     * Extend the existing selection to a new position
     * @param {number} row - New ending row
     * @param {number} col - New ending column
     */
    extend(row, col) {
        if (!this.active) {
            this.start(row, col);
            return;
        }
        
        this.endRow = row;
        this.endCol = col;
        this.log("Extended selection to", row, col, "now:", this.getDebugInfo());
    }

    /**
     * Clear the current selection
     */
    clear() {
        if (this.active) {
            this.log("Clearing selection");
            this.active = false;
        }
    }

    /**
     * Check if the selection contains the given position
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @returns {boolean} True if position is within selection
     */
    contains(row, col) {
        if (!this.active) return false;
        
        const { startRow, startCol, endRow, endCol } = this.normalizedRange;
        
        this.log("Checking if selection contains", row, col,
                "Selection range:", startRow, startCol, "to", endRow, endCol);
        
        // Handle multi-line selection
        if (startRow < endRow) {
            // First line of selection
            if (row === startRow) {
                return col >= startCol;
            }
            // Last line of selection
            else if (row === endRow) {
                return col < endCol;
            }
            // Middle lines (entire line is selected)
            else if (row > startRow && row < endRow) {
                return true;
            }
            // Outside selection
            else {
                return false;
            }
        }
        // Single line selection
        else if (startRow === endRow) {
            return row === startRow && col >= startCol && col < endCol;
        }
        
        return false;
    }

    /**
     * Get the text selected in the buffer
     * @param {EditorBuffer} buffer - The editor buffer
     * @returns {string} The selected text
     */
    getSelectedText(buffer) {
        if (!this.active || !buffer) return "";
        
        const { startRow, startCol, endRow, endCol } = this.normalizedRange;
        this.log("Getting selected text from:", startRow, startCol, "to", endRow, endCol);
        
        let result = "";
        
        // Extract the selected text from the buffer
        if (startRow === endRow) {
            // Selection is on a single line
            result = buffer.getLine(startRow).substring(startCol, endCol);
            this.log("Single-line selection, text:", result);
        } else {
            // Selection spans multiple lines
            // Get first line (partial)
            const firstLine = buffer.getLine(startRow).substring(startCol);
            result = firstLine + "\n";
            this.log("First line of selection:", firstLine);
            
            // Get middle lines (full)
            for (let row = startRow + 1; row < endRow; row++) {
                const middleLine = buffer.getLine(row);
                result += middleLine + "\n";
                this.log("Middle line " + row + ":", middleLine);
            }
            
            // Get last line (partial)
            const lastLine = buffer.getLine(endRow).substring(0, endCol);
            result += lastLine;
            this.log("Last line of selection:", lastLine);
        }
        
        this.log("Full selected text:", result);
        return result;
    }

    /**
     * Check if selection is in forward direction (start is before end)
     * @returns {boolean} True if selection is forward
     */
    get isForward() {
        if (this.startRow < this.endRow) return true;
        if (this.startRow > this.endRow) return false;
        return this.startCol <= this.endCol;
    }

    /**
     * Get the selection range with start before end (normalized)
     * @returns {Object} Normalized selection range
     */
    get normalizedRange() {
        if (this.isForward) {
            return {
                startRow: this.startRow,
                startCol: this.startCol,
                endRow: this.endRow,
                endCol: this.endCol
            };
        } else {
            return {
                startRow: this.endRow,
                startCol: this.endCol,
                endRow: this.startRow,
                endCol: this.startCol
            };
        }
    }

    /**
     * Get information about the selection for debugging
     * @returns {Object} Selection debug info
     */
    getDebugInfo() {
        return {
            active: this.active,
            start: `${this.startRow}:${this.startCol}`,
            end: `${this.endRow}:${this.endCol}`,
            normalized: this.normalizedRange,
            isForward: this.isForward
        };
    }
}