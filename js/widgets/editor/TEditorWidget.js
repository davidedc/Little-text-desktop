// --- TEditorWidget ---
class TEditorWidget extends TScrollableWidget {
    constructor(posX, posY, width, height, title, initialText = "") {
        super(posX, posY, width, height, title);
        this.buffer = new EditorBuffer(initialText.split('\n'));
        this.cursor = new EditorCursor();
        const contentWidth = Math.max(1, this.w - 3);
        const contentHeight = Math.max(1, this.h - 3);
        this.editorWindow = new EditorWindow(contentHeight, contentWidth);
        this.isCursorBlinking = false; 
        this.cursorBlinkTimer = null;
    }

    // Handle gaining focus - reset cursor blinking state and start blink timer
    gainFocus() {
        super.gainFocus();
        this.isCursorBlinking = false;
        this.resetCursorBlinkTimer();
    }

    // Handle losing focus - clean up cursor blinking timer and state
    loseFocus() {
        super.loseFocus();
        clearTimeout(this.cursorBlinkTimer);
        this.cursorBlinkTimer = null;
        this.isCursorBlinking = false;
    }

    // Reset the cursor blink timer and handle redraw logic
    resetCursorBlinkTimer() {
        // Clear any existing blink timer
        clearTimeout(this.cursorBlinkTimer);
        this.cursorBlinkTimer = null;

        // Check if we need to redraw based on previous blink state
        const needsRedraw = this.isCursorBlinking;
        this.isCursorBlinking = false;

        // Redraw if needed and has focus
        if (needsRedraw && this.hasFocus) {
            drawTWidgets();
        }

        // Start new blink timer if focused
        if (this.hasFocus) {
            this.cursorBlinkTimer = setTimeout(() => {
                this.isCursorBlinking = true;
                this.cursorBlinkTimer = null;
                
                // Only redraw if focused
                if (this.hasFocus) {
                    drawTWidgets();
                }
            }, CURSOR_BLINK_DELAY);
        }
    }

    // Update dimensions of editor window and adjust cursor/scroll position
    updateDimensions(w, h) {
        super.updateDimensions(w, h);
        // Calculate content dimensions accounting for borders
        const cW = Math.max(1, this.w - 3);
        const cH = Math.max(1, this.h - 3);
        
        // Update editor window dimensions
        this.editorWindow.n_rows = cH;
        this.editorWindow.n_cols = cW;
        
        // Ensure cursor stays within valid bounds
        this.cursor.row = clamp(this.cursor.row, 0, this.buffer.bottom);
        this.cursor._clamp_col(this.buffer);
        
        // Adjust scroll position based on cursor
        this.editorWindow.down(this.buffer, this.cursor);
        this.editorWindow.horizontal_scroll(this.cursor);
    }

    // Clear the content area of the editor window
    clearContents(a) {
        const d = this.getContentDimensions();
        for (let j = this.y + 1; j < this.y + 1 + d.contentHeight; j++) {
            for (let i = this.x + 1; i < this.x + 1 + d.contentWidth; i++) {
                if (j < GRID_HEIGHT_chars && i < GRID_WIDTH_chars) {
                    setChar(a, i, j, ' ');
                }
            }
        }
    }

    /**
     * Implementation of TScrollableWidget abstract method
     * Calculate dimensions of editor content area and determine if scrollbars are needed
     */
    getContentDimensions() {
        // Calculate maximum height and width without borders
        const maxHeight = Math.max(0, this.h - 2);
        const maxWidth = Math.max(0, this.w - 2);

        // Check if vertical scrollbar might be needed initially
        const verticalPossiblyNeeded = this.buffer.length > maxHeight && 
                                     maxWidth > 0 && 
                                     maxHeight > 0;

        // Check if horizontal scrollbar might be needed initially  
        const horizontalPossiblyNeeded = this.buffer.maxLineLength > maxWidth && 
                                       maxWidth > 0 && 
                                       maxHeight > 0;

        // Adjust height for horizontal scrollbar if needed
        const heightForVertical = maxHeight - (horizontalPossiblyNeeded ? 1 : 0);

        // Final check if vertical scrollbar is needed with adjusted height
        const verticalNeeded = this.buffer.length > heightForVertical && 
                             maxWidth > 0 && 
                             heightForVertical > 0;

        // Adjust width for vertical scrollbar if needed
        const widthForHorizontal = maxWidth - (verticalPossiblyNeeded ? 1 : 0);

        // Final check if horizontal scrollbar is needed with adjusted width
        const horizontalNeeded = this.buffer.maxLineLength > widthForHorizontal && 
                               widthForHorizontal > 0 && 
                               maxHeight > 0;

        // Calculate scrollbar dimensions
        const verticalScrollWidth = verticalNeeded ? 1 : 0;
        const horizontalScrollHeight = horizontalNeeded ? 1 : 0;

        // Calculate final content dimensions accounting for scrollbars
        const contentWidth = Math.max(0, this.w - 2 - verticalScrollWidth);
        const contentHeight = Math.max(0, this.h - 2 - horizontalScrollHeight);

        const result = {
            vScrollNeeded: verticalNeeded,
            hScrollNeeded: horizontalNeeded, 
            contentWidth: contentWidth,
            contentHeight: contentHeight
        };

        this.debugLog("Content dimensions:", result);
        return result;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get total content size for vertical scrolling
     */
    getVerticalContentSize() {
        return this.buffer.length;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get total content size for horizontal scrolling
     */
    getHorizontalContentSize() {
        return this.buffer.maxLineLength;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get current vertical scroll position
     */
    getVerticalScrollPosition() {
        return this.editorWindow.row;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Get current horizontal scroll position
     */
    getHorizontalScrollPosition() {
        return this.editorWindow.col;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Set vertical scroll position
     */
    setVerticalScrollPosition(position) {
        if (this.editorWindow.row !== position) {
            this.editorWindow.row = position;
            this.resetCursorBlinkTimer();
            return true;
        }
        return false;
    }
    
    /**
     * Implementation of TScrollableWidget abstract method
     * Set horizontal scroll position
     */
    setHorizontalScrollPosition(position) {
        if (this.editorWindow.col !== position) {
            this.editorWindow.col = position;
            this.resetCursorBlinkTimer();
            return true;
        }
        return false;
    }

    draw_content(a) {
        // Get references to commonly used objects
        const win = this.editorWindow;
        const buf = this.buffer;
        const dims = this.getContentDimensions();

        // Set window dimensions
        win.n_rows = dims.contentHeight;
        win.n_cols = dims.contentWidth;

        // Calculate cursor position for drawing at the beginning
        const { rel_row: relRow, rel_col: relCol } = win.translate(this.cursor);

        this.debugLog("Drawing content, cursor at rel:", relRow, relCol);

        // Draw editor content if there is space
        if (dims.contentWidth > 0 && dims.contentHeight > 0) {
            for (let rr = 0; rr < dims.contentHeight; rr++) {
                // Get line content, handling out of bounds
                const br = win.row + rr;
                let l = (br >= 0 && br < buf.length) ? buf.getLine(br) : "";

                // Apply horizontal scroll and width limits
                l = l.substring(win.col);
                if (l.length > dims.contentWidth) {
                    l = l.substring(0, dims.contentWidth);
                }

                // Draw line characters
                const sy = this.y + 1 + rr;
                for (let rc = 0; rc < dims.contentWidth; rc++) {
                    const sx = this.x + 1 + rc;
                    const ch = rc < l.length ? l[rc] : ' ';
                    
                    // Check if this cell contains the cursor
                    const isCursorCell = this.hasFocus && 
                                       relRow === rr && 
                                       relCol === rc;
                    
                    if (isCursorCell) {
                        // Use a styled cursor cell
                        this.debugLog("Drawing cursor at", sx, sy);
                        setChar(a, sx, sy, Cell.cursor(ch, this.isCursorBlinking));
                    } else {
                        // Use a regular character
                        setChar(a, sx, sy, ch);
                    }
                }
            }
        }

        // Use base class to draw scrollbars
        this.drawScrollbars(a, dims);
    }

    // The following methods are now handled by TScrollableWidget
    // We remove these implementations and use the base class versions

    // Handle keyboard input for editor navigation and text manipulation
    handleKeyPress(e) {
        let handled = true;
        const key = e.key;
        const win = this.editorWindow;
        const buf = this.buffer;
        const cur = this.cursor;

        this.resetCursorBlinkTimer();

        // Ensure cursor stays within valid bounds
        cur.row = clamp(cur.row, 0, buf.bottom);
        cur._clamp_col(buf);
        win.down(buf, cur);
        win.horizontal_scroll(cur);

        if (key === "ArrowLeft") {
            editorLeft(win, buf, cur);
        }
        else if (key === "ArrowRight") {
            editorRight(win, buf, cur);
        }
        else if (key === "ArrowUp") {
            cur.up(buf);
            win.up(cur);
            win.horizontal_scroll(cur);
        }
        else if (key === "ArrowDown") {
            cur.down(buf);
            win.down(buf, cur);
            win.horizontal_scroll(cur);
        }
        else if (key === "Enter") {
            buf.split(cur);
            editorRight(win, buf, cur);
        }
        else if (key === "Backspace") {
            if (cur.row > 0 || cur.col > 0) {
                editorLeft(win, buf, cur);
                buf.delete(cur);
            }
        }
        else if (key === "Delete" || (e.ctrlKey && key === 'd')) {
            buf.delete(cur);
        }
        else if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            buf.insert(cur, key);
            for (let i = 0; i < key.length; i++) {
                editorRight(win, buf, cur);
            }
        }
        else {
            handled = false;
        }

        if (handled) {
            e.preventDefault();
            drawTWidgets();
        }
        return handled;
    }

    // Handle mouse click for cursor positioning
    click(x, y) {
        super.click(x, y);
        console.log("Editor click at", x, y);
        this.resetCursorBlinkTimer();

        const dims = this.getContentDimensions();
        const relX = x - this.x - 1;
        const relY = y - this.y - 1;
        const win = this.editorWindow;
        
        console.log("Editor content area:", dims.contentWidth, dims.contentHeight);
        console.log("Relative click position:", relX, relY);

        if (relX >= 0 && relX < dims.contentWidth && relY >= 0 && relY < dims.contentHeight) {
            const targetRow = win.row + relY;
            const targetCol = win.col + relX;
            
            console.log("Setting cursor to buffer position:", targetRow, targetCol);

            this.cursor.row = clamp(targetRow, 0, this.buffer.bottom);
            const lineLength = this.buffer.getLine(this.cursor.row).length;
            this.cursor.col = clamp(targetCol, 0, lineLength);
            
            console.log("Final cursor position:", this.cursor.row, this.cursor.col);

            win.up(this.cursor);
            win.down(this.buffer, this.cursor);
            win.horizontal_scroll(this.cursor);
            drawTWidgets();
        } else {
            console.log("Click outside editor content area");
        }
    }

    // For scroll handling, we use the base class implementation
    // from TScrollableWidget
}