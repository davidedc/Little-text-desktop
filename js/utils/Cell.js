/**
 * Represents a cell in the character grid that can contain plain text or styled HTML
 */
class Cell {
    /**
     * Create a new cell with either a plain character or HTML content
     * @param {string} content - The character or HTML content
     * @param {boolean} isHtml - Whether the content is HTML or a plain character
     */
    constructor(content = ' ', isHtml = false) {
        this.content = content;
        this.isHtml = isHtml;
    }

    /**
     * Returns the string representation of the cell
     * @returns {string} The cell content
     */
    toString() {
        if (this.isHtml) {
            return this.content; // HTML content is already prepared
        } else {
            // Escape any special characters in plain text
            return escapeHtml(this.content);
        }
    }

    /**
     * Creates a cell with a cursor effect
     * @param {string} char - The character to display inside the cursor
     * @param {boolean} blink - Whether the cursor should blink
     * @returns {Cell} A cell with cursor HTML
     */
    static cursor(char, blink = false) {
        const displayChar = (char === ' ' || !char) ? ' ' : escapeHtml(char);
        const blinkClass = blink ? ' cursor-blink' : '';
        return new Cell(`<span class="cursor${blinkClass}">${displayChar}</span>`, true);
    }

    /**
     * Creates a cell with close button styling
     * @returns {Cell} A cell with close button HTML
     */
    static closeButton() {
        return new Cell('<span class="close-button">X</span>', true);
    }

    /**
     * Creates a cell with resize handle styling
     * @returns {Cell} A cell with resize handle HTML
     */
    static resizeHandle() {
        return new Cell('<span class="resize-handle">◢</span>', true);
    }
}