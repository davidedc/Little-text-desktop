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
        this.selectionAutoScrollTimer = null; // Timer for auto-scrolling during selection
        this.lastMouseX = 0; // Last mouse X position for auto-scroll timer
        this.lastMouseY = 0; // Last mouse Y position for auto-scroll timer
        
        // Initialize selection
        this.selection = new EditorSelection();
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
    
    /**
     * Clean up resources when widget is destroyed
     */
    destroy() {
        // Clear any timers
        if (this.cursorBlinkTimer) {
            clearTimeout(this.cursorBlinkTimer);
            this.cursorBlinkTimer = null;
        }
        if (this.selectionAutoScrollTimer) {
            clearInterval(this.selectionAutoScrollTimer);
            this.selectionAutoScrollTimer = null;
        }
        super.destroy();
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

        // Get current scroll position and buffer size
        const currentVerticalPos = this.getVerticalScrollPosition();
        const currentHorizontalPos = this.getHorizontalScrollPosition();
        const totalLines = this.buffer.length;
        const maxLineLength = this.buffer.maxLineLength;

        this.debugLog("DIMS - Editor window position:", 
                     "row:", this.editorWindow.row, 
                     "col:", this.editorWindow.col);
        this.debugLog("DIMS - Buffer:", 
                     "totalLines:", totalLines, 
                     "maxLineLength:", maxLineLength);
        this.debugLog("DIMS - Viewport:", 
                     "maxHeight:", maxHeight, 
                     "maxWidth:", maxWidth);

        // Check if vertical scrollbar might be needed initially
        // Consider: either content > viewport OR we're scrolled down
        const verticalPossiblyNeeded = (this.buffer.length > maxHeight || currentVerticalPos > 0) && 
                                     maxWidth > 0 && 
                                     maxHeight > 0;

        // Check if horizontal scrollbar might be needed initially  
        // Consider: either content > viewport OR we're scrolled right
        const horizontalPossiblyNeeded = (this.buffer.maxLineLength > maxWidth || currentHorizontalPos > 0) && 
                                       maxWidth > 0 && 
                                       maxHeight > 0;

        // Adjust height for horizontal scrollbar if needed
        const heightForVertical = maxHeight - (horizontalPossiblyNeeded ? 1 : 0);

        // Final check if vertical scrollbar is needed with adjusted height
        const verticalNeeded = (this.buffer.length > heightForVertical || currentVerticalPos > 0) && 
                             maxWidth > 0 && 
                             heightForVertical > 0;

        // Adjust width for vertical scrollbar if needed
        const widthForHorizontal = maxWidth - (verticalPossiblyNeeded ? 1 : 0);

        // Final check if horizontal scrollbar is needed with adjusted width
        const horizontalNeeded = (this.buffer.maxLineLength > widthForHorizontal || currentHorizontalPos > 0) && 
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

        this.debugLog("Content dimensions result:", result);
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
                    
                    // Check if this cell is part of the selection
                    const isSelectedCell = this.selection.active && 
                                         this.selection.contains(br, win.col + rc);
                    
                    if (isCursorCell && isSelectedCell) {
                        // Cell is both cursor and selected
                        this.debugLog("Drawing cursor in selection at", sx, sy);
                        setChar(a, sx, sy, Cell.selected(ch, true));
                    } else if (isCursorCell) {
                        // Cell is just cursor
                        this.debugLog("Drawing cursor at", sx, sy);
                        setChar(a, sx, sy, Cell.cursor(ch, this.isCursorBlinking));
                    } else if (isSelectedCell) {
                        // Cell is just selected
                        setChar(a, sx, sy, Cell.selected(ch));
                    } else {
                        // Regular character
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
        const isShiftPressed = e.shiftKey;

        this.resetCursorBlinkTimer();

        // Ensure cursor stays within valid bounds
        cur.row = clamp(cur.row, 0, buf.bottom);
        cur._clamp_col(buf);
        win.down(buf, cur);
        win.horizontal_scroll(cur);

        // Track cursor position before movement for selection
        const oldRow = cur.row;
        const oldCol = cur.col;

        // Handle arrow keys for navigation and selection
        if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
            // If there's an active selection and shift is not pressed
            if (this.selection.active && !isShiftPressed) {
                this.debugLog("Selection active, positioning cursor based on arrow key");
                const { startRow, startCol, endRow, endCol } = this.selection.normalizedRange;
                
                if (key === "ArrowLeft") {
                    // Left arrow: Move cursor to start of selection
                    this.debugLog("Moving cursor to start of selection:", startRow, startCol);
                    cur.row = startRow;
                    cur.col = startCol;
                    this.selection.clear();
                } 
                else if (key === "ArrowRight") {
                    // Right arrow: Move cursor to end of selection
                    this.debugLog("Moving cursor to end of selection:", endRow, endCol);
                    cur.row = endRow;
                    cur.col = endCol;
                    this.selection.clear();
                }
                else if (key === "ArrowUp") {
                    // Up arrow: Move cursor up from the start of the selection
                    this.debugLog("Moving cursor up from start of selection");
                    cur.row = startRow;
                    cur.col = startCol;
                    this.selection.clear();
                    
                    // Now move up one row while preserving column
                    cur.up(buf);
                }
                else if (key === "ArrowDown") {
                    // Down arrow: Move cursor down from the end of the selection
                    this.debugLog("Moving cursor down from end of selection");
                    cur.row = endRow;
                    cur.col = endCol;
                    this.selection.clear();
                    
                    // Now move down one row while preserving column
                    cur.down(buf);
                }
                
                // Ensure cursor is in view
                win.up(cur);
                win.down(buf, cur);
                win.horizontal_scroll(cur);
                
                // We've handled this case, but don't return immediately
                // just set handled = true and continue to the common end
                handled = true;
            } 
            // If there's no selection or shift is pressed
            else {
                // Start selection if Shift is pressed and we don't have an active selection
                if (isShiftPressed && !this.selection.active) {
                    this.selection.start(oldRow, oldCol);
                }
                
                // Move cursor based on arrow key
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
                
                // Update selection if Shift is pressed
                if (isShiftPressed) {
                    this.selection.extend(cur.row, cur.col);
                } else {
                    // Clear selection when moving cursor without Shift
                    this.selection.clear();
                }
            }
        }
        // Other editing commands
        else if (key === "Enter") {
            // Clear selection before inserting newline
            this.selection.clear();
            buf.split(cur);
            editorRight(win, buf, cur);
        }
        else if (key === "Backspace") {
            // Delete selection or character
            if (this.selection.active) {
                // TODO: Implement delete selection
                // For now, just clear selection
                this.selection.clear();
            } else if (cur.row > 0 || cur.col > 0) {
                editorLeft(win, buf, cur);
                buf.delete(cur);
            }
        }
        else if (key === "Delete" || (e.ctrlKey && key === 'd')) {
            // Delete selection or character
            if (this.selection.active) {
                // TODO: Implement delete selection
                // For now, just clear selection
                this.selection.clear();
            } else {
                buf.delete(cur);
            }
        }
        else if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            // Replace selection with typed character
            if (this.selection.active) {
                // TODO: Implement replace selection
                // For now, just clear selection
                this.selection.clear();
            }
            
            // Insert character and move cursor
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

    /**
     * Handle mouse press (called on mousedown)
     * @param {number} x - Mouse x coordinate in character units
     * @param {number} y - Mouse y coordinate in character units
     * @returns {boolean} - True if the event was handled, false otherwise
     */
    mouseDown(x, y) {
        console.log("Editor mouseDown at", x, y);
        
        // First check if parent implementation handles it (e.g., scrollbars)
        if (super.mouseDown(x, y)) {
            return true;
        }

        // Now handle editor-specific mouseDown (cursor positioning and selection start)
        const dims = this.getContentDimensions();
        const relX = x - this.x - 1;
        const relY = y - this.y - 1;
        
        console.log("Editor content area:", dims.contentWidth, dims.contentHeight);
        console.log("Relative mouseDown position:", relX, relY);

        // Check if mouse is within content area
        if (relX >= 0 && relX < dims.contentWidth && relY >= 0 && relY < dims.contentHeight) {
            this.resetCursorBlinkTimer();
            
            const win = this.editorWindow;
            const targetRow = win.row + relY;
            const targetCol = win.col + relX;
            
            console.log("Setting cursor to buffer position:", targetRow, targetCol);

            // Update cursor position
            this.cursor.row = clamp(targetRow, 0, this.buffer.bottom);
            const lineLength = this.buffer.getLine(this.cursor.row).length;
            this.cursor.col = clamp(targetCol, 0, lineLength);
            
            console.log("Final cursor position:", this.cursor.row, this.cursor.col);

            // Clear any existing selection
            this.selection.clear();
            
            // Set up selection start (actual selection will happen on mouse move)
            if (!interactionState.isSelecting()) {
                interactionState.startSelecting(this, x, y);
                // Start selection at current cursor position
                this.selection.start(this.cursor.row, this.cursor.col);
            }

            win.up(this.cursor);
            win.down(this.buffer, this.cursor);
            win.horizontal_scroll(this.cursor);
            drawTWidgets();
            return true;
        }
        
        console.log("MouseDown not handled by editor");
        return false;
    }
    
    /**
     * Extend selection to a position
     * @param {number} x - Mouse x coordinate in character units
     * @param {number} y - Mouse y coordinate in character units
     * @returns {boolean} - True if selection was updated
     */
    extendSelection(x, y) {
        // Detailed logging to track selection process
        this.debugLog("=== EXTEND SELECTION START ===");
        this.debugLog("Mouse position:", x, y);
        this.debugLog("Widget bounds:", this.x, this.y, this.w, this.h);
        
        const dims = this.getContentDimensions();
        const win = this.editorWindow;
        
        // Calculate relative positions more carefully
        const relX = x - this.x - 1;
        const relY = y - this.y - 1;
        
        this.debugLog("Relative position:", relX, relY);
        this.debugLog("Current window scroll:", win.row, win.col);
        this.debugLog("Content dimensions:", dims.contentWidth, dims.contentHeight);
        this.debugLog("Buffer size:", this.buffer.length, this.buffer.maxLineLength);
        
        // Determine auto-scroll direction more precisely
        // We need to detect which edge of the widget the mouse is closest to
        
        // Calculate distances to widget edges
        const distToTop = y - this.y;
        const distToBottom = (this.y + this.h) - y;
        const distToLeft = x - this.x;
        const distToRight = (this.x + this.w) - x;
        
        // Detect if we need auto-scrolling and in which direction
        let scrollVertical = 0;  // -1: up, 0: none, 1: down
        let scrollHorizontal = 0; // -1: left, 0: none, 1: right
        
        // Determine vertical scroll direction
        if (distToTop <= 1 && win.row > 0) {
            scrollVertical = -1; // Scroll up
        } else if (distToBottom <= 1 && win.row + dims.contentHeight < this.buffer.length) {
            scrollVertical = 1;  // Scroll down
        }
        
        // Determine horizontal scroll direction
        if (distToLeft <= 1 && win.col > 0) {
            scrollHorizontal = -1; // Scroll left
        } else if (distToRight <= 1 && win.col + dims.contentWidth < this.buffer.maxLineLength) {
            scrollHorizontal = 1;  // Scroll right
        }
        
        this.debugLog("Scroll direction - vertical:", scrollVertical, "horizontal:", scrollHorizontal);
        
        // Apply auto-scrolling (only one step per call to avoid jumps)
        let autoScrolled = false;
        
        if (scrollVertical === -1) {
            this.debugLog("Auto-scrolling UP");
            win.row = Math.max(0, win.row - 1);
            autoScrolled = true;
        } else if (scrollVertical === 1) {
            this.debugLog("Auto-scrolling DOWN");
            win.row++;
            autoScrolled = true;
        }
        
        if (scrollHorizontal === -1) {
            this.debugLog("Auto-scrolling LEFT");
            win.col = Math.max(0, win.col - 1);
            autoScrolled = true;
        } else if (scrollHorizontal === 1) {
            this.debugLog("Auto-scrolling RIGHT");
            win.col++;
            autoScrolled = true;
        }
        
        // Calculate target cursor position
        let targetRow, targetCol;
        
        // Handle vertical position - convert mouse position to buffer coordinates
        if (relY < 0) {
            // Above viewport - target first visible line
            targetRow = win.row;
            this.debugLog("Mouse above viewport, targeting first visible row:", targetRow);
        } else if (relY >= dims.contentHeight) {
            // Below viewport - target last visible line
            targetRow = win.row + dims.contentHeight - 1;
            this.debugLog("Mouse below viewport, targeting last visible row:", targetRow);
        } else {
            // Within viewport - direct mapping
            targetRow = win.row + relY;
            this.debugLog("Mouse within viewport vertical, targeting row:", targetRow);
        }
        
        // Handle horizontal position - convert mouse position to buffer coordinates
        if (relX < 0) {
            // Left of viewport - target start of visible area
            targetCol = win.col;
            this.debugLog("Mouse left of viewport, targeting start column:", targetCol);
        } else if (relX >= dims.contentWidth) {
            // Right of viewport - target end of visible area
            targetCol = win.col + dims.contentWidth - 1;
            this.debugLog("Mouse right of viewport, targeting end column:", targetCol);
        } else {
            // Within viewport - direct mapping
            targetCol = win.col + relX;
            this.debugLog("Mouse within viewport horizontal, targeting column:", targetCol);
        }
        
        // Safety: clamp to valid buffer ranges
        targetRow = clamp(targetRow, 0, this.buffer.bottom);
        const lineLength = this.buffer.getLine(targetRow).length;
        targetCol = clamp(targetCol, 0, lineLength);
        
        this.debugLog("Final target position (after clamping):", targetRow, targetCol);
        
        // Update cursor position
        const cursorMoved = (this.cursor.row !== targetRow || this.cursor.col !== targetCol);
        if (cursorMoved) {
            this.debugLog("Cursor moved from", this.cursor.row, this.cursor.col, "to", targetRow, targetCol);
            this.cursor.row = targetRow;
            this.cursor.col = targetCol;
        }
        
        // Extend selection to new cursor position
        this.selection.extend(this.cursor.row, this.cursor.col);
        
        // Adjust scroll if needed (in addition to auto-scroll)
        win.up(this.cursor);
        win.down(this.buffer, this.cursor);
        win.horizontal_scroll(this.cursor);
        
        this.debugLog("Selection state after update:", this.selection.getDebugInfo());
        this.debugLog("=== EXTEND SELECTION END ===");
        
        // Return whether anything changed - scrolling or cursor movement
        return autoScrolled || cursorMoved;
    }
    
    // Handle mouse click for cursor positioning (still needed for compatibility)
    click(x, y) {
        super.click(x, y);
        console.log("Editor click at", x, y);
        
        // The cursor is already positioned by mouseDown.
        // If we didn't drag (no selection was made), clear any existing selection
        if (!this.selection.active || 
            (this.selection.startRow === this.selection.endRow && 
             this.selection.startCol === this.selection.endCol)) {
            this.selection.clear();
            // Redraw to show selection cleared
            drawTWidgets();
        }
    }

    // For scroll handling, we use the base class implementation
    // from TScrollableWidget
}