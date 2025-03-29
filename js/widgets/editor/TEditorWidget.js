// --- TEditorWidget ---
class TEditorWidget extends TScrollableWidget {
    constructor(posX, posY, width, height, title, initialText = "") {
        // Call super with the original title, without any word wrap indicators
        super(posX, posY, width, height, title);
        
        this.buffer = new EditorBuffer(initialText.split('\n'));
        this.cursor = new EditorCursor();

        // --- Word Wrap State ---
        this.wordWrapEnabled = false;
        // Cache for visual layout when wrapping is enabled
        this.visualLayoutCache = {
            lines: [],          // Array of { text, logicalRow, startCol, endCol }
            totalVisualLines: 0,
            contentWidth: -1,   // Width used for calculation
            bufferVersion: -1   // To track buffer changes
        };
        this.visualScrollTop = 0; // Index of the top-most visible VISUAL line
        this.bufferVersion = 0; // Increment when buffer changes

        // --- Original State (used when wrapping is off) ---
        const contentWidth = Math.max(1, this.w - 3); // Initial estimate
        const contentHeight = Math.max(1, this.h - 3); // Initial estimate
        this.editorWindow = new EditorWindow(contentHeight, contentWidth); // Still used for non-wrapped mode

        // --- Other State ---
        this.isCursorBlinking = false;
        this.cursorBlinkTimer = null;
        this.selectionAutoScrollTimer = null; // Timer for auto-scrolling during selection
        this.lastMouseX = 0; // Last mouse X position for auto-scroll timer
        this.lastMouseY = 0; // Last mouse Y position for auto-scroll timer
        this.internalClipboard = ""; // Fallback clipboard for browsers without clipboard API
        this.selection = new EditorSelection();
        this.META_KEY = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

        // Ensure initial state is consistent
        this._updateEditorWindowState(); // Calculate initial internal dimensions
        // Don't call ensureCursorVisible here, constructor might run before layout is stable
        this.debugLog(`Using ${this.META_KEY} as meta key for this platform`);
    }

    // --- Special Cursor Behavior ---
    
    /**
     * Handles special cursor movement at document boundaries.
     * When pressing "up" at the first visual line, moves cursor to line start.
     * When pressing "down" at the last visual line, moves cursor to line end.
     * 
     * @param {string} direction - The direction of movement ("up" or "down")
     * @param {boolean} isShiftPressed - Whether shift is pressed (for selection)
     * @returns {boolean} - Whether the movement was handled
     */
    handleCursorBoundaryMovement(direction, isShiftPressed) {
        // If any selection is active, don't activate special behavior
        // unless shift is pressed (extending selection)
        if (this.selection.active && !isShiftPressed) {
            return false;
        }
        
        if (this.wordWrapEnabled) {
            // --- Handle word wrap mode - use visual lines ---
            const currentLogicalPos = { row: this.cursor.row, col: this.cursor.col };
            const currentVisualPos = this.mapLogicalToVisual(currentLogicalPos.row, currentLogicalPos.col);
            
            if (!currentVisualPos) return false; // Bail if mapping fails
            
            const totalVisualLines = this.getTotalVisualLines();
            
            if (direction === "up" && currentVisualPos.visualLineIndex === 0) {
                console.log("At first visual line, pressing up - moving to line start");
                // At first visual line and pressing up - move to beginning of visual line
                // Get logical position of first visual line start
                const logicalStart = this.mapVisualToLogical(0, 0);
                if (!logicalStart) return false;
                
                // Store cursor state for selection
                const oldRow = this.cursor.row;
                const oldCol = this.cursor.col;
                
                // Move cursor to start of first visual line
                this.cursor.row = logicalStart.logicalRow;
                this.cursor.col = logicalStart.logicalCol;
                
                // Handle selection update if shift is pressed
                if (isShiftPressed) {
                    if (!this.selection.active) {
                        this.selection.start(oldRow, oldCol);
                    }
                    this.selection.extend(this.cursor.row, this.cursor.col);
                } else if (this.selection.active) {
                    this.selection.clear();
                }
                
                return true;
            }
            else if (direction === "down" && currentVisualPos.visualLineIndex >= totalVisualLines - 1) {
                console.log("At last visual line, pressing down - moving to line end", 
                           {currentIndex: currentVisualPos.visualLineIndex, totalLines: totalVisualLines});
                // At last visual line and pressing down - move to end of visual line
                const lastVisualLineIndex = totalVisualLines - 1;
                const dims = this.getContentDimensions();
                const layout = this.getVisualLayout(dims.contentWidth);
                
                if (lastVisualLineIndex < 0 || lastVisualLineIndex >= layout.length) 
                    return false;
                
                const lastVisualLine = layout[lastVisualLineIndex];
                
                // Store cursor state for selection
                const oldRow = this.cursor.row;
                const oldCol = this.cursor.col;
                
                // Move cursor to end of last visual line
                this.cursor.row = lastVisualLine.logicalRow;
                this.cursor.col = lastVisualLine.startCol + lastVisualLine.text.length;
                
                // Handle selection update if shift is pressed
                if (isShiftPressed) {
                    if (!this.selection.active) {
                        this.selection.start(oldRow, oldCol);
                    }
                    this.selection.extend(this.cursor.row, this.cursor.col);
                } else if (this.selection.active) {
                    this.selection.clear();
                }
                
                return true;
            }
            
            return false; // Not a boundary case in wrapped mode
        } 
        else {
            // --- Handle non-wrapped mode - use logical lines ---
            const currentRow = this.cursor.row;
            
            if (direction === "up" && currentRow === 0) {
                // At first line and pressing up - move to beginning of line
                
                // Store cursor state for selection if needed
                const oldCol = this.cursor.col;
                
                // Move to line start
                this.cursor.col = 0;
                
                // Handle selection update if shift is pressed
                if (isShiftPressed) {
                    if (!this.selection.active) {
                        this.selection.start(currentRow, oldCol);
                    }
                    this.selection.extend(currentRow, 0);
                } else if (this.selection.active) {
                    this.selection.clear();
                }
                
                return true;
            } 
            else if (direction === "down" && currentRow === this.buffer.bottom) {
                // At last line and pressing down - move to end of line
                
                // Store cursor state for selection if needed
                const oldCol = this.cursor.col;
                const lineLength = this.buffer.getLine(currentRow).length;
                
                // Move to line end
                this.cursor.col = lineLength;
                
                // Handle selection update if shift is pressed
                if (isShiftPressed) {
                    if (!this.selection.active) {
                        this.selection.start(currentRow, oldCol);
                    }
                    this.selection.extend(currentRow, lineLength);
                } else if (this.selection.active) {
                    this.selection.clear();
                }
                
                return true;
            }
            
            return false; // Not a boundary case in unwrapped mode
        }
    }
    
    // --- Word Wrap Toggle ---

    toggleWordWrap() {
        console.log("toggleWordWrap called, current state:", this.wordWrapEnabled);
        this.wordWrapEnabled = !this.wordWrapEnabled;
        console.log("New word wrap state:", this.wordWrapEnabled);
        this.debugLog(`Word Wrap ${this.wordWrapEnabled ? 'Enabled' : 'Disabled'}`);
        this.invalidateVisualLayoutCache(); // Clear cache on toggle

        // Reset scroll position appropriately
        if (this.wordWrapEnabled) {
            // Map current logical top row to approximate visual top
            // Need dimensions first to calculate layout
            const dims = this.getContentDimensions();
            const visualMapping = this.mapLogicalToVisual(this.editorWindow.row, 0);
            this.visualScrollTop = visualMapping ? visualMapping.visualLineIndex : 0;
            // Ensure the new scroll top is valid
            const totalVisualLines = this.getTotalVisualLines();
            const maxScrollTop = Math.max(0, totalVisualLines - dims.contentHeight);
            this.visualScrollTop = clamp(this.visualScrollTop, 0, maxScrollTop);
            this.editorWindow.col = 0; // Horizontal scroll irrelevant when wrapped
        } else {
            // Map current visual top to approximate logical top
            // Need dimensions first to calculate layout
             const dims = this.getContentDimensions();
            const logicalMapping = this.mapVisualToLogical(this.visualScrollTop, 0);
            this.editorWindow.row = logicalMapping ? logicalMapping.logicalRow : 0;
            // Ensure the new logical scroll top is valid
            const maxLogicalScrollTop = Math.max(0, this.buffer.length - dims.contentHeight);
             this.editorWindow.row = clamp(this.editorWindow.row, 0, maxLogicalScrollTop);
            // Keep editorWindow.col as it was (or reset if needed)
        }
        this._updateEditorWindowState(); // Ensure dimensions reflect new state
        this.ensureCursorVisible(); // Adjust scroll to show cursor in new mode
        this.resetCursorBlinkTimer();
    }

    // --- Visual Layout Cache & Mapping (for Word Wrap) ---

    invalidateVisualLayoutCache() {
        this.visualLayoutCache.contentWidth = -1; // Mark as invalid
        this.visualLayoutCache.lines = [];
        this.visualLayoutCache.totalVisualLines = 0;
        // Logging removed to reduce noise
    }

    /**
     * Calculates or retrieves the cached visual layout of the buffer.
     * Each entry in the returned array represents one VISUAL line.
     * @param {number} width The content width to wrap at.
     * @returns {Array<Object>} Array of { text, logicalRow, startCol, endCol } objects.
     */
    getVisualLayout(width) {
        // Use cached version if valid
        if (this.visualLayoutCache.contentWidth === width &&
            this.visualLayoutCache.bufferVersion === this.bufferVersion) {
            return this.visualLayoutCache.lines;
        }
         // Avoid calculation if width is invalid or wrap is off
         if (width <= 0 || !this.wordWrapEnabled) {
             // Return empty or potentially stale cache if needed elsewhere? No, return empty.
             return [];
         }

        // Compact logging for layout calculation
        const layout = [];
        let totalVisualLines = 0;

        for (let logicalRow = 0; logicalRow < this.buffer.length; logicalRow++) {
            const lineText = this.buffer.getLine(logicalRow);
            if (lineText.length === 0) {
                // Empty logical line is one visual line
                layout.push({ text: "", logicalRow: logicalRow, startCol: 0, endCol: 0 });
                totalVisualLines++;
            } else {
                const wrappedSegments = wrapText(lineText, width); // Use existing util
                let currentLogicalCol = 0;
                for (const segment of wrappedSegments) {
                    const segmentLength = segment.length;
                    // Calculate end column carefully: it's the start + length of the *segment*
                    const segmentEndCol = currentLogicalCol + segmentLength;
                    layout.push({
                        text: segment,
                        logicalRow: logicalRow,
                        startCol: currentLogicalCol,
                        endCol: segmentEndCol // Represents the logical end col for *this segment*
                    });
                    totalVisualLines++;

                    // Advance logical column position for the next segment
                    currentLogicalCol = segmentEndCol;
                    // Check if a space was consumed by the wrap at this position
                     if (currentLogicalCol < lineText.length && lineText[currentLogicalCol] === ' ') {
                       currentLogicalCol++; // Account for the space that might have caused the wrap
                     }
                }
            }
        }

        // Update cache
        this.visualLayoutCache.lines = layout;
        this.visualLayoutCache.totalVisualLines = totalVisualLines;
        this.visualLayoutCache.contentWidth = width;
        this.visualLayoutCache.bufferVersion = this.bufferVersion;

        return layout;
    }

    /** Gets the total number of visual lines required for the buffer content. */
    getTotalVisualLines() {
        if (!this.wordWrapEnabled) return this.buffer.length; // Not applicable if not wrapped

        const dims = this.getContentDimensions(); // Get current content width
        // Ensure cache is populated for the current width and buffer version
        this.getVisualLayout(dims.contentWidth);
        return this.visualLayoutCache.totalVisualLines;
    }

    /**
     * Maps a visual line index and column to logical buffer coordinates.
     * @param {number} visualLineIndex Absolute index in the visual layout.
     * @param {number} visualCol Column index within the visual line.
     * @returns {{logicalRow: number, logicalCol: number}|null} Logical coordinates or null if invalid.
     */
    mapVisualToLogical(visualLineIndex, visualCol) {
        if (!this.wordWrapEnabled) return null; // Only makes sense in wrap mode

        const dims = this.getContentDimensions();
        const layout = this.getVisualLayout(dims.contentWidth);

        if (visualLineIndex < 0 || visualLineIndex >= layout.length) {
             this.debugLog(`mapVisualToLogical: visualLineIndex ${visualLineIndex} out of bounds (0-${layout.length -1})`);
            // Handle edge case: clicking below last line should map to end of buffer
            if (layout.length > 0) {
                 const lastLineInfo = layout[layout.length - 1];
                 // Map to the end of the last logical line
                 const lastLogicalLineLen = this.buffer.getLine(lastLineInfo.logicalRow).length;
                 return { logicalRow: lastLineInfo.logicalRow, logicalCol: lastLogicalLineLen };
            }
             return null; // No layout, no mapping
        }

        const lineInfo = layout[visualLineIndex];
        // Clamp visualCol to the length of the visual segment
        const clampedVisualCol = clamp(visualCol, 0, lineInfo.text.length);
        // Logical column is the start of the segment + offset within segment
        const logicalCol = lineInfo.startCol + clampedVisualCol;

        //this.debugLog(`Map Visual (${visualLineIndex}, ${visualCol}) -> Logical (${lineInfo.logicalRow}, ${logicalCol}) (Segment: "${lineInfo.text}")`);
        return { logicalRow: lineInfo.logicalRow, logicalCol: logicalCol };
    }

    /**
     * Maps logical buffer coordinates to visual coordinates.
     * @param {number} logicalRow Logical row index.
     * @param {number} logicalCol Logical column index.
     * @returns {{visualLineIndex: number, visualColIndex: number}|null} Visual coordinates or null if invalid.
     */
    mapLogicalToVisual(logicalRow, logicalCol) {
        if (!this.wordWrapEnabled) return null; // Only makes sense in wrap mode

        const dims = this.getContentDimensions();
        const layout = this.getVisualLayout(dims.contentWidth);
        let currentVisualLineIndex = 0;
        
        // Track all segments for this logical row to find best match if exact match fails
        let rowSegments = [];

        // Clamp input logical coordinates to valid buffer range first
        logicalRow = clamp(logicalRow, 0, this.buffer.bottom);
        const lineLen = this.buffer.getLine(logicalRow).length;
        logicalCol = clamp(logicalCol, 0, lineLen);

        // First pass: collect all segments for this row and look for exact match
        for (const lineInfo of layout) {
            if (lineInfo.logicalRow === logicalRow) {
                // Save this segment info for possible fallback
                rowSegments.push({
                    visualLineIndex: currentVisualLineIndex,
                    startCol: lineInfo.startCol,
                    endCol: lineInfo.endCol,
                    text: lineInfo.text
                });
                
                // Check if the logical column falls within this visual segment
                // Note: logicalCol can be EQUAL to endCol (cursor at end of segment)
                if (logicalCol >= lineInfo.startCol && logicalCol <= lineInfo.endCol) {
                    const visualColIndex = logicalCol - lineInfo.startCol;
                    return { visualLineIndex: currentVisualLineIndex, visualColIndex: visualColIndex };
                }
            }
            // If we passed the target logical row entirely, the column must be at the end of the last segment of that row
            if (lineInfo.logicalRow > logicalRow) {
                 // This means logicalCol was > lineInfo.endCol for the last segment of the target row
                 if (currentVisualLineIndex > 0) {
                     const prevLineInfo = layout[currentVisualLineIndex - 1];
                     // Ensure the previous visual line was indeed part of the target logical row
                     if (prevLineInfo.logicalRow === logicalRow) {
                         return { visualLineIndex: currentVisualLineIndex - 1, visualColIndex: prevLineInfo.text.length };
                     }
                 }
                 break; // No more segments for this row, exit loop for fallback
            }
            currentVisualLineIndex++;
        }
        
        // If we have segments for this row, find the best match
        if (rowSegments.length > 0) {
            // Try to find the segment whose range the column is closest to
            let bestSegment = rowSegments[0];
            let minDistance = Number.MAX_SAFE_INTEGER;
            
            for (const segment of rowSegments) {
                // If col is before segment start
                if (logicalCol < segment.startCol) {
                    const distance = segment.startCol - logicalCol;
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestSegment = segment;
                    }
                } 
                // If col is after segment end
                else if (logicalCol > segment.endCol) {
                    const distance = logicalCol - segment.endCol;
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestSegment = segment;
                    }
                }
                // Should never get here since we already checked exact matches
            }
            
            // Use the best segment - position at beginning or end depending on which is closer
            let visualColIndex;
            if (logicalCol < bestSegment.startCol) {
                visualColIndex = 0; // Beginning of segment
            } else {
                visualColIndex = bestSegment.text.length; // End of segment
            }
            
            // Debug log removed
            return { visualLineIndex: bestSegment.visualLineIndex, visualColIndex: visualColIndex };
        }
        
        // If no segments found for this row, handle special cases
        if (layout.length > 0) {
            // Try to find a reasonable position based on row relation
            const lastLine = layout[layout.length - 1];
            
            if (logicalRow > lastLine.logicalRow) {
                // If target row is beyond last line in layout, go to end
                return {visualLineIndex: layout.length - 1, visualColIndex: lastLine.text.length};
            } else if (logicalRow < layout[0].logicalRow) {
                // If target row is before first line in layout, go to start
                return {visualLineIndex: 0, visualColIndex: 0};
            }
            
            // Find last line before target row and first line after
            let beforeIndex = -1;
            let afterIndex = -1;
            
            for (let i = 0; i < layout.length; i++) {
                if (layout[i].logicalRow < logicalRow) {
                    beforeIndex = i;
                } else if (layout[i].logicalRow > logicalRow && afterIndex === -1) {
                    afterIndex = i;
                    break;
                }
            }
            
            if (beforeIndex !== -1) {
                // Position at end of last line before target row
                return {visualLineIndex: beforeIndex, visualColIndex: layout[beforeIndex].text.length};
            } else if (afterIndex !== -1) {
                // Position at start of first line after target row
                return {visualLineIndex: afterIndex, visualColIndex: 0};
            }
        }

        // Debug log removed
        
        // Important: Instead of returning null, return a safe default position - THIS IS THE KEY FIX!
        if (layout.length > 0) {
            return {visualLineIndex: 0, visualColIndex: 0};
        }
        
        return null;
    }

    /** Adjusts scroll position to ensure the cursor is visible. */
    ensureCursorVisible() {
        // Delay slightly maybe? ensureCursorVisible called often during init/resize.
        // requestAnimationFrame might be too much delay. Let's try direct first.

        const dims = this.getContentDimensions();
        if (dims.contentHeight <= 0) return; // Cannot scroll if no visible height

        let needsRedraw = false;

        if (this.wordWrapEnabled) {
            const mapping = this.mapLogicalToVisual(this.cursor.row, this.cursor.col);
            // With our fix to always return a mapping, this should rarely happen
            if (!mapping) {
                return;
            }

            const cursorVisualLine = mapping.visualLineIndex;
            const scrollBottom = this.visualScrollTop + dims.contentHeight - 1;
            let newScrollTop = this.visualScrollTop;

            if (cursorVisualLine < this.visualScrollTop) {
                // Cursor is above the viewport
                newScrollTop = cursorVisualLine;
            } else if (cursorVisualLine > scrollBottom) {
                // Cursor is below the viewport
                newScrollTop = cursorVisualLine - dims.contentHeight + 1;
            }

            // Clamp scroll position
            const totalVisualLines = this.getTotalVisualLines();
            const maxScrollTop = Math.max(0, totalVisualLines - dims.contentHeight);
            newScrollTop = clamp(newScrollTop, 0, maxScrollTop);

            if (this.visualScrollTop !== newScrollTop) {
                this.visualScrollTop = newScrollTop; // Update internal state directly
                needsRedraw = true;
            }

        } else {
            // Original logic when not wrapped
            const oldRow = this.editorWindow.row;
            const oldCol = this.editorWindow.col;
            this.editorWindow.up(this.cursor); // Adjusts window row if cursor above
            this.editorWindow.down(this.buffer, this.cursor); // Adjusts window row if cursor below
            this.editorWindow.horizontal_scroll(this.cursor); // Adjusts window col
            if(this.editorWindow.row !== oldRow || this.editorWindow.col !== oldCol) {
                needsRedraw = true;
            }
        }

        if(needsRedraw) {
            // If scroll changed, we need to redraw the whole screen potentially
            drawTWidgets();
        }
    }

    // --- TScrollableWidget Overrides ---

    getContentDimensions() {
        const maxHeight = Math.max(0, this.h - 2);
        const maxWidth = Math.max(0, this.w - 2);

        let verticalNeeded = false;
        let horizontalNeeded = false;
        let contentWidth = maxWidth;
        let contentHeight = maxHeight;

        if (this.wordWrapEnabled) {
            // --- Wrapped Mode ---
            horizontalNeeded = false; // No horizontal scrollbar when wrapped

            // Estimate vertical scroll need based on *potential* width
            let potentialWidth = maxWidth; // Assume no vScroll first
            let totalVisualLines = this.getVisualLayout(potentialWidth).length; // Use layout function
            verticalNeeded = totalVisualLines > maxHeight && potentialWidth > 0 && maxHeight > 0;

            // Final content width depends on whether vScroll is needed
            contentWidth = Math.max(0, maxWidth - (verticalNeeded ? 1 : 0));
            contentHeight = maxHeight; // Height doesn't change for V scrollbar

            // If contentWidth changed, re-evaluate vertical scroll need based on *final* width
            if(potentialWidth !== contentWidth) {
                totalVisualLines = this.getVisualLayout(contentWidth).length; // Recalculate with final width
                verticalNeeded = totalVisualLines > contentHeight && contentWidth > 0 && contentHeight > 0;
            }

        } else {
            // --- Non-Wrapped Mode (Original Logic Adapted) ---
            const currentVerticalPos = this.editorWindow.row;
            const currentHorizontalPos = this.editorWindow.col;
            const totalLines = this.buffer.length;
            const maxLineLength = this.buffer.maxLineLength;

            // Estimate H scroll need first
            let potentialWidth = maxWidth;
             const hPossiblyNeeded = (maxLineLength > potentialWidth || currentHorizontalPos > 0) && potentialWidth > 0 && maxHeight > 0;

            // Estimate V scroll need based on potential height adjusted for H scroll
             let potentialHeight = maxHeight - (hPossiblyNeeded ? 1: 0);
            const vPossiblyNeeded = (totalLines > potentialHeight || currentVerticalPos > 0) && maxWidth > 0 && potentialHeight > 0;


            // Final decision on scrollbars based on interplay
             verticalNeeded = vPossiblyNeeded;
             horizontalNeeded = (maxLineLength > (maxWidth - (verticalNeeded? 1: 0)) || currentHorizontalPos > 0)
                                 && (maxWidth - (verticalNeeded? 1: 0)) > 0 && maxHeight > 0;

              // Re-check V need based on final H decision
               verticalNeeded = (totalLines > (maxHeight - (horizontalNeeded? 1: 0)) || currentVerticalPos > 0)
                                 && maxWidth > 0 && (maxHeight - (horizontalNeeded? 1: 0)) > 0;


            // Final dimensions
            contentWidth = Math.max(0, maxWidth - (verticalNeeded ? 1 : 0));
            contentHeight = Math.max(0, maxHeight - (horizontalNeeded ? 1 : 0));
        }

        const result = {
            vScrollNeeded: verticalNeeded,
            hScrollNeeded: horizontalNeeded,
            contentWidth: contentWidth,
            contentHeight: contentHeight
        };

       // this.debugLog("Content dimensions result:", result);
        return result;
    }

    getVerticalContentSize() {
        if (this.wordWrapEnabled) {
            // We need the layout calculated for the *current* width to get total lines
            const dims = this.getContentDimensions();
            return this.getVisualLayout(dims.contentWidth).length; // Use layout function which caches total
        } else {
            return this.buffer.length;
        }
    }

    getHorizontalContentSize() {
        if (this.wordWrapEnabled) {
            return 0; // No horizontal extent when wrapped
        } else {
            return this.buffer.maxLineLength;
        }
    }

    getVerticalScrollPosition() {
        if (this.wordWrapEnabled) {
            return this.visualScrollTop;
        } else {
            return this.editorWindow.row;
        }
    }

    getHorizontalScrollPosition() {
        if (this.wordWrapEnabled) {
            return 0;
        } else {
            return this.editorWindow.col;
        }
    }

    setVerticalScrollPosition(position) {
        let changed = false;
        position = Math.round(position); // Ensure integer position

        if (this.wordWrapEnabled) {
            const dims = this.getContentDimensions();
            const totalVisualLines = this.getTotalVisualLines(); // Gets cached or calculates
            const maxScrollTop = Math.max(0, totalVisualLines - dims.contentHeight);
            const clampedPosition = clamp(position, 0, maxScrollTop);
            if (this.visualScrollTop !== clampedPosition) {
                //this.debugLog(`Setting visual scroll top from ${this.visualScrollTop} to ${clampedPosition}`);
                this.visualScrollTop = clampedPosition;
                changed = true;
            }
        } else {
            const dims = this.getContentDimensions(); // Need dims for n_rows
            const maxScrollTop = Math.max(0, this.buffer.length - dims.contentHeight);
             const clampedPosition = clamp(position, 0, maxScrollTop);
            if (this.editorWindow.row !== clampedPosition) {
                this.editorWindow.row = clampedPosition;
                changed = true;
            }
        }

        if (changed) {
            this.resetCursorBlinkTimer();
            // Don't redraw here, let the caller (e.g., scroll handler) do it
        }
        return changed;
    }

    setHorizontalScrollPosition(position) {
         let changed = false;
         position = Math.round(position); // Ensure integer position

        if (this.wordWrapEnabled) {
            // No horizontal scrolling when wrapped
             if (this.editorWindow.col !== 0) { // Reset if needed
                  this.editorWindow.col = 0;
                  changed = true;
              }
        } else {
            const dims = this.getContentDimensions(); // Need dims for n_cols
            const maxScrollLeft = Math.max(0, this.buffer.maxLineLength - dims.contentWidth);
            const clampedPosition = clamp(position, 0, maxScrollLeft);
            if (this.editorWindow.col !== clampedPosition) {
                this.editorWindow.col = clampedPosition;
                changed = true;
            }
        }
         if (changed) {
            this.resetCursorBlinkTimer();
             // Don't redraw here
         }
        return changed;
    }

    /** Updates the editorWindow's dimensions based on calculated content size */
    _updateEditorWindowState() {
        const dims = this.getContentDimensions();
        let stateChanged = false;
        if (this.editorWindow.n_rows !== dims.contentHeight) {
            this.editorWindow.n_rows = dims.contentHeight;
            stateChanged = true;
        }
         if (this.editorWindow.n_cols !== dims.contentWidth) {
            this.editorWindow.n_cols = dims.contentWidth;
            stateChanged = true;
         }
        // If dimensions changed, re-clamp scroll positions
         if (stateChanged) {
            if (this.wordWrapEnabled) {
                 this.setVerticalScrollPosition(this.visualScrollTop);
            } else {
                this.setVerticalScrollPosition(this.editorWindow.row);
                this.setHorizontalScrollPosition(this.editorWindow.col);
            }
         }
    }

    // --- Drawing ---

    draw_content(charGrid) {
        const dims = this.getContentDimensions();
        this._updateEditorWindowState(); // Ensure editorWindow state matches calculated dims

        if (dims.contentWidth <= 0 || dims.contentHeight <= 0) {
             this.drawScrollbars(charGrid, dims); // Still draw scrollbars maybe
             return; // No space to draw content
         }

        if (this.wordWrapEnabled) {
            // --- Word Wrap Rendering ---
            const layout = this.getVisualLayout(dims.contentWidth);
            // Map logical cursor to visual AFTER layout is calculated/retrieved
            const cursorVisualPos = this.mapLogicalToVisual(this.cursor.row, this.cursor.col);
            
            // No logging needed - mapping should succeed thanks to our fix

            for (let visualRow = 0; visualRow < dims.contentHeight; visualRow++) {
                const absoluteVisualLineIndex = this.visualScrollTop + visualRow;
                const screenY = this.y + 1 + visualRow;

                if (absoluteVisualLineIndex >= 0 && absoluteVisualLineIndex < layout.length) {
                    const lineInfo = layout[absoluteVisualLineIndex];
                    const lineText = lineInfo.text;

                    for (let visualCol = 0; visualCol < dims.contentWidth; visualCol++) {
                        const screenX = this.x + 1 + visualCol;
                        const char = visualCol < lineText.length ? lineText[visualCol] : ' ';

                        // Determine logical coordinates for selection check
                        const logicalColForSelection = lineInfo.startCol + visualCol;

                        let isCursorCell = false;
                        // If mapping failed but logical coordinates match this cell, show cursor here
                        const isLogicalMatch = (this.hasFocus && !cursorVisualPos && 
                                               lineInfo.logicalRow === this.cursor.row && 
                                               logicalColForSelection === this.cursor.col);
                        
                        // Normal case - use visual mapping
                        const isVisualMatch = (this.hasFocus && cursorVisualPos && 
                                              cursorVisualPos.visualLineIndex === absoluteVisualLineIndex && 
                                              cursorVisualPos.visualColIndex === visualCol);
                        
                        if (isLogicalMatch || isVisualMatch) {
                            isCursorCell = true;
                        }

                        let isSelectedCell = false;
                         if (this.selection.active) {
                             isSelectedCell = this.selection.contains(lineInfo.logicalRow, logicalColForSelection);
                         }

                        // Render cell with appropriate style
                        if (isCursorCell && isSelectedCell) {
                            setChar(charGrid, screenX, screenY, Cell.selected(char, true));
                        } else if (isCursorCell) {
                             setChar(charGrid, screenX, screenY, Cell.cursor(char, this.isCursorBlinking));
                        } else if (isSelectedCell) {
                            setChar(charGrid, screenX, screenY, Cell.selected(char));
                        } else {
                            setChar(charGrid, screenX, screenY, char);
                        }
                    }
                } else {
                    // Draw empty lines below content
                    for (let visualCol = 0; visualCol < dims.contentWidth; visualCol++) {
                        setChar(charGrid, this.x + 1 + visualCol, screenY, ' ');
                    }
                }
            }

        } else {
            // --- Original Rendering (No Wrap) ---
            const win = this.editorWindow;
            const buf = this.buffer;
             const { rel_row: cursorRelRow, rel_col: cursorRelCol } = win.translate(this.cursor); // Use original window translation


            for (let rr = 0; rr < dims.contentHeight; rr++) {
                const logicalRow = win.row + rr;
                const screenY = this.y + 1 + rr;
                let lineText = (logicalRow >= 0 && logicalRow < buf.length) ? buf.getLine(logicalRow) : "";

                // Apply horizontal scroll and width limits
                if (lineText.length > win.col) {
                     lineText = lineText.substring(win.col);
                 } else {
                     lineText = "";
                 }

                if (lineText.length > dims.contentWidth) {
                    lineText = lineText.substring(0, dims.contentWidth);
                }

                // Draw line characters
                for (let screenCol = 0; screenCol < dims.contentWidth; screenCol++) {
                    const screenX = this.x + 1 + screenCol;
                    const char = screenCol < lineText.length ? lineText[screenCol] : ' ';
                    const bufferCol = win.col + screenCol; // Calculate corresponding buffer column

                    const isCursorCell = this.hasFocus && cursorRelRow === rr && cursorRelCol === screenCol;
                    const isSelectedCell = this.selection.active && this.selection.contains(logicalRow, bufferCol);

                    if (isCursorCell && isSelectedCell) {
                        setChar(charGrid, screenX, screenY, Cell.selected(char, true));
                    } else if (isCursorCell) {
                        setChar(charGrid, screenX, screenY, Cell.cursor(char, this.isCursorBlinking));
                    } else if (isSelectedCell) {
                        setChar(charGrid, screenX, screenY, Cell.selected(char));
                    } else {
                        setChar(charGrid, screenX, screenY, char);
                    }
                }
            }
        }

        // Use base class to draw scrollbars (aware of wrapping state via getContentDimensions)
        this.drawScrollbars(charGrid, dims);
    }


    // --- Event Handling (Modified for Word Wrap) ---

    handleKeyPress(e) {
        let handled = true;
        const key = e.key;
        const isShiftPressed = e.shiftKey;
        const isMetaPressed = e[this.META_KEY];
        const isAltPressed = e.altKey;

        this.resetCursorBlinkTimer();

        // Handle modifier keys alone - don't let them affect selection
        if (['Alt', 'Shift', 'Control', 'Meta', 'CapsLock'].includes(key)) {
            // Don't clear selection or change state for modifier keys alone
            // Return true to indicate we're handling it (preventing default behavior)
            console.log(`Handling modifier key: ${key}`);
            return true; 
        }

        // Store cursor state before modification for selection logic
        const oldRow = this.cursor.row;
        const oldCol = this.cursor.col;
        let selectionStarted = false; // Track if selection begins in this event
        let bufferModified = false; // Track if buffer content changed

        // --- Alt+W Toggle Word Wrap ---
        // Check for Alt+W in multiple ways to support different platforms
        // 1. Standard way: Alt key + 'w'/'W'
        // 2. MacOS way: Alt+W produces "∑" character
        // 3. Code-based detection: Alt key + code "KeyW"
        if ((isAltPressed && (key === 'w' || key === 'W')) || 
            (key === '∑') ||  // MacOS Alt+W produces this character
            (isAltPressed && e.code === 'KeyW')) {
            
            console.log(`Alt+W detected! key=${key}, altKey=${isAltPressed}, code=${e.code}, keyCode=${e.keyCode}`);
            e.preventDefault();
            console.log("Before toggle - wordWrapEnabled:", this.wordWrapEnabled);
            this.toggleWordWrap();
            console.log("After toggle - wordWrapEnabled:", this.wordWrapEnabled);
            showStatusMessage(`Word Wrap ${this.wordWrapEnabled ? 'Enabled' : 'Disabled'}`, 2000);
            return true;
        }

        // --- Clipboard ---
        if (isMetaPressed && (key === 'x' || key === 'c' || key === 'v')) {
            e.preventDefault();
            if (key === 'x') {
                this.cutSelectedText().then(success => {
                    bufferModified = success; // Cut modifies buffer
                    if(!success) showStatusMessage("Nothing to cut", 2000);
                });
            } else if (key === 'c') {
                this.copySelectedText().then(success => !success && showStatusMessage("Nothing to copy", 2000));
            } else if (key === 'v') {
                this.pasteText().then(success => {
                    bufferModified = success; // Paste modifies buffer
                });
            }
             // Don't return yet, need finalization below if bufferModified
             // return true; // Original premature return

        } else
        // --- Editing and Navigation ---
        if (this.wordWrapEnabled) {
            // ===============================
            // --- Wrapped Mode Key Handling ---
            // ===============================
            const currentLogicalPos = { row: this.cursor.row, col: this.cursor.col };
            // Map current logical position to visual - needed for visual navigation
            const currentVisualPos = this.mapLogicalToVisual(currentLogicalPos.row, currentLogicalPos.col);
            let targetVisualPos = currentVisualPos ? { ...currentVisualPos } : null; // Target visual position
            let targetLogicalPos = null; // Calculated logical position from target visual or action
            let preserveColHint = true; // Default: preserve column hint for vertical moves

            // --- Handle Character Input / Simple Edits First ---
            if (key.length === 1 && !isMetaPressed && !e.ctrlKey && !e.altKey) {
                 if (this.selection.active) {
                     this.replaceSelection(key);
                 } else {
                     this.insertTextAtCursor(key);
                 }
                 targetLogicalPos = {row: this.cursor.row, col: this.cursor.col }; // Update from insertion
                 preserveColHint = false; // Reset hint on typing
                 bufferModified = true;
            } else if (key === "Enter") {
                 if (this.selection.active) this.replaceSelection("\n"); else this.insertTextAtCursor("\n");
                 targetLogicalPos = {row: this.cursor.row, col: this.cursor.col }; // Update from insertion
                 preserveColHint = false;
                 bufferModified = true;
            } else if (key === "Backspace") {
                  if (this.selection.active) this.deleteSelection();
                  else {
                      // Perform logical backspace relative to current logical position
                       if (currentLogicalPos.row > 0 || currentLogicalPos.col > 0) {
                           this.cursor.left(this.buffer); // Move logical cursor left
                           this.buffer.delete(this.cursor); // Delete at the new logical position
                       }
                  }
                  targetLogicalPos = {row: this.cursor.row, col: this.cursor.col }; // Update from deletion
                  preserveColHint = false;
                  bufferModified = true;
            } else if (key === "Delete" || (e.ctrlKey && key === 'd')) { // Handle Ctrl+D as Delete
                 if (this.selection.active) this.deleteSelection();
                 else this.buffer.delete(this.cursor); // Delete at the current logical position
                 targetLogicalPos = {row: this.cursor.row, col: this.cursor.col }; // Update from deletion
                 preserveColHint = false;
                 bufferModified = true;
            } else
            // --- Handle Navigation ---
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
                 if (this.selection.active && !isShiftPressed) {
                     // --- Collapse selection ---
                     const { startRow, startCol, endRow, endCol } = this.selection.normalizedRange;
                     if (key === "ArrowLeft" || key === "ArrowUp") targetLogicalPos = { row: startRow, col: startCol };
                     else targetLogicalPos = { row: endRow, col: endCol }; // Right or Down
                     this.selection.clear();

                     // Perform additional logical move for Up/Down after collapsing
                     if(key === "ArrowUp" && targetLogicalPos) { this.cursor.row = targetLogicalPos.row; this.cursor.col = targetLogicalPos.col; this.cursor.up(this.buffer); targetLogicalPos = {row: this.cursor.row, col: this.cursor.col}; }
                     if(key === "ArrowDown" && targetLogicalPos) { this.cursor.row = targetLogicalPos.row; this.cursor.col = targetLogicalPos.col; this.cursor.down(this.buffer); targetLogicalPos = {row: this.cursor.row, col: this.cursor.col}; }
                      preserveColHint = (key === "ArrowUp" || key === "ArrowDown"); // Preserve hint only for the U/D collapse+move

                 } else if (targetVisualPos) {
                     // --- Move cursor (potentially starting selection) ---
                      if (isShiftPressed && !this.selection.active) {
                          this.selection.start(oldRow, oldCol);
                          selectionStarted = true;
                      }
                     // Use visual coordinates for navigation logic
                     const layout = this.getVisualLayout(this.getContentDimensions().contentWidth);
                     switch (key) {
                          case "ArrowLeft":
                              targetVisualPos.visualColIndex--;
                               if (targetVisualPos.visualColIndex < 0 && targetVisualPos.visualLineIndex > 0) {
                                   targetVisualPos.visualLineIndex--;
                                    const prevLineInfo = layout[targetVisualPos.visualLineIndex];
                                    targetVisualPos.visualColIndex = prevLineInfo ? prevLineInfo.text.length : 0;
                               } else targetVisualPos.visualColIndex = Math.max(0, targetVisualPos.visualColIndex);
                              preserveColHint = false;
                              break;
                          case "ArrowRight":
                              targetVisualPos.visualColIndex++;
                               if (targetVisualPos.visualLineIndex < layout.length) {
                                   const currentLineInfo = layout[targetVisualPos.visualLineIndex];
                                    // Allow moving one past end visually only if not last visual line
                                    const maxCol = currentLineInfo.text.length + (targetVisualPos.visualLineIndex < layout.length - 1 ? 1: 0);

                                    if (targetVisualPos.visualColIndex >= maxCol && targetVisualPos.visualLineIndex < layout.length - 1) {
                                        // Wrap to next visual line
                                        targetVisualPos.visualLineIndex++;
                                        targetVisualPos.visualColIndex = 0;
                                     } else {
                                         // Clamp column on same line (allow one past end visually)
                                         targetVisualPos.visualColIndex = Math.min(currentLineInfo.text.length, targetVisualPos.visualColIndex);
                                    }
                               }
                              preserveColHint = false;
                              break;
                          case "ArrowUp":
                              // Check if this is a boundary case
                              if (this.handleCursorBoundaryMovement("up", isShiftPressed)) {
                                 // If handled, we still need to ensure cursor is visible and reset blink timer
                                 this.ensureCursorVisible();
                                 this.resetCursorBlinkTimer();
                                 drawTWidgets(); // Force immediate redraw
                                 return true;
                              }
                              
                              targetVisualPos.visualLineIndex = Math.max(0, targetVisualPos.visualLineIndex - 1);
                              // Map hint column to visual column on the target line
                              const upTargetLogical = this.mapVisualToLogical(targetVisualPos.visualLineIndex, this.cursor._col_hint);
                              if (upTargetLogical) {
                                  const upTargetVisual = this.mapLogicalToVisual(upTargetLogical.logicalRow, upTargetLogical.logicalCol);
                                  if (upTargetVisual && upTargetVisual.visualLineIndex === targetVisualPos.visualLineIndex) {
                                     targetVisualPos.visualColIndex = upTargetVisual.visualColIndex;
                                  } else { // Fallback if mapping gets weird
                                      targetVisualPos.visualColIndex = 0; // Go to start of line
                                  }
                              } else targetVisualPos.visualColIndex = 0;

                              //targetVisualPos.visualColIndex = this.cursor._col_hint; // Simpler way using hint directly
                              break;
                          case "ArrowDown":
                              // Check if this is a boundary case
                              if (this.handleCursorBoundaryMovement("down", isShiftPressed)) {
                                 // If handled, we still need to ensure cursor is visible and reset blink timer
                                 this.ensureCursorVisible();
                                 this.resetCursorBlinkTimer();
                                 drawTWidgets(); // Force immediate redraw
                                 return true;
                              }
                              
                              const totalLines = this.getTotalVisualLines();
                              targetVisualPos.visualLineIndex = Math.min(totalLines - 1, targetVisualPos.visualLineIndex + 1);
                              // Map hint column to visual column on the target line
                              const downTargetLogical = this.mapVisualToLogical(targetVisualPos.visualLineIndex, this.cursor._col_hint);
                              if (downTargetLogical) {
                                  const downTargetVisual = this.mapLogicalToVisual(downTargetLogical.logicalRow, downTargetLogical.logicalCol);
                                  if (downTargetVisual && downTargetVisual.visualLineIndex === targetVisualPos.visualLineIndex) {
                                     targetVisualPos.visualColIndex = downTargetVisual.visualColIndex;
                                  } else { // Fallback
                                      targetVisualPos.visualColIndex = 0;
                                  }
                              } else targetVisualPos.visualColIndex = 0;
                              //targetVisualPos.visualColIndex = this.cursor._col_hint; // Simpler way using hint directly
                              break;
                     }
                       // If navigation happened, calculate the target logical position
                       targetLogicalPos = this.mapVisualToLogical(targetVisualPos.visualLineIndex, targetVisualPos.visualColIndex);

                 } else handled = false; // Cannot determine current visual position

            } else {
                 handled = false; // Key not handled in wrapped mode
            }

            // --- Update state after action (Wrapped) ---
            if(handled && targetLogicalPos) {
                 // Set new cursor logical position - check for correct property names
                 if (targetLogicalPos.logicalRow !== undefined) {
                     this.cursor.row = targetLogicalPos.logicalRow;
                 } else if (targetLogicalPos.row !== undefined) {
                     this.cursor.row = targetLogicalPos.row;
                 }
                 
                 // Set column, preserving hint only if appropriate
                 if (preserveColHint) {
                     const rowToUse = this.cursor.row;
                     // Safety check
                     if (rowToUse >= 0 && rowToUse < this.buffer.length) {
                         const lineLen = this.buffer.getLine(rowToUse).length;
                         // Use hint for Y pos, but clamp X based on visual mapping result
                         const colToUse = targetLogicalPos.logicalCol !== undefined ? 
                                         targetLogicalPos.logicalCol : 
                                         targetLogicalPos.col;
                         
                         this.cursor._col = clamp(colToUse, 0, lineLen);
                         // col_hint remains the same during vertical movement
                     }
                 } else {
                     const colToUse = targetLogicalPos.logicalCol !== undefined ? 
                                     targetLogicalPos.logicalCol : 
                                     targetLogicalPos.col;
                                     
                     if (colToUse !== undefined) {
                         this.cursor.col = colToUse; // Updates hint automatically
                     }
                 }

                 // Update selection if Shift is pressed
                 if (isShiftPressed && (selectionStarted || this.selection.active)) {
                     this.selection.extend(this.cursor.row, this.cursor.col);
                 } else if (!isShiftPressed && !selectionStarted && this.selection.active && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
                      // Don't clear selection if we just collapsed it with an arrow key
                  } else if (!isShiftPressed && this.selection.active) {
                      this.selection.clear();
                  }
             } else if (handled && !targetLogicalPos && targetVisualPos && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
                 // Handle case where navigation resulted in invalid logical mapping (e.g., beyond buffer end)
                 // Try to map to a valid position like buffer end
                 const dims = this.getContentDimensions();
                 const layout = this.getVisualLayout(dims.contentWidth);
                 if (layout.length > 0) {
                     const lastVisLine = layout[layout.length - 1];
                     this.cursor.row = lastVisLine.logicalRow;
                     this.cursor.col = lastVisLine.endCol; // Go to end of last logical segment
                 }
                 // And clear selection if needed
                 if (!isShiftPressed && this.selection.active) this.selection.clear();
             }


        } else {
            // ===================================
            // --- Non-Wrapped Mode Key Handling ---
            // ===================================
            const win = this.editorWindow;
            const buf = this.buffer;
            const cur = this.cursor;

             if (this.selection.active && !isShiftPressed && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
                  // --- Collapse selection ---
                  const { startRow, startCol, endRow, endCol } = this.selection.normalizedRange;
                  if (key === "ArrowLeft" || key === "ArrowUp") { cur.row = startRow; cur.col = startCol; }
                  else { cur.row = endRow; cur.col = endCol; } // Right or Down
                  this.selection.clear();
                   
                  // Additional move for Up/Down with boundary check
                  if(key === "ArrowUp") {
                      if (this.handleCursorBoundaryMovement("up", false)) {
                          // If handled, we still need to ensure cursor is visible and reset blink timer
                          this.ensureCursorVisible();
                          this.resetCursorBlinkTimer();
                          // Drawing happens at the end of handleKeyPress
                      } else {
                          cur.up(buf);
                      }
                  }
                  if(key === "ArrowDown") {
                      if (this.handleCursorBoundaryMovement("down", false)) {
                          // If handled, we still need to ensure cursor is visible and reset blink timer
                          this.ensureCursorVisible();
                          this.resetCursorBlinkTimer();
                          // Drawing happens at the end of handleKeyPress
                      } else {
                          cur.down(buf);
                      }
                  }

             } else {
                 // --- Move cursor or perform action (potentially starting selection) ---
                  if (isShiftPressed && !this.selection.active) {
                      this.selection.start(oldRow, oldCol);
                      selectionStarted = true;
                  }

                 if (key === "ArrowLeft") editorLeft(win, buf, cur);
                 else if (key === "ArrowRight") editorRight(win, buf, cur);
                 else if (key === "ArrowUp") {
                     // Check for boundary case first
                     if (this.handleCursorBoundaryMovement("up", isShiftPressed)) {
                         // If handled, we still need to ensure cursor is visible and reset blink timer
                         this.ensureCursorVisible();
                         this.resetCursorBlinkTimer();
                         // No need to call drawTWidgets() here as it's called at the end of handleKeyPress
                     } else {
                         cur.up(buf); // win adjustments done in ensureCursorVisible
                     }
                 }
                 else if (key === "ArrowDown") {
                     // Check for boundary case first
                     if (this.handleCursorBoundaryMovement("down", isShiftPressed)) {
                         // If handled, we still need to ensure cursor is visible and reset blink timer
                         this.ensureCursorVisible();
                         this.resetCursorBlinkTimer();
                         // No need to call drawTWidgets() here as it's called at the end of handleKeyPress
                     } else {
                         cur.down(buf); // win adjustments done in ensureCursorVisible
                     }
                 }
                 else if (key === "Enter") { if (this.selection.active) this.replaceSelection("\n"); else { buf.split(cur); editorRight(win, buf, cur); }; bufferModified = true; }
                 else if (key === "Backspace") { if (this.selection.active) this.deleteSelection(); else if (cur.row > 0 || cur.col > 0) { editorLeft(win, buf, cur); buf.delete(cur); }; bufferModified = true; }
                 else if (key === "Delete" || (e.ctrlKey && key === 'd')) { if (this.selection.active) this.deleteSelection(); else buf.delete(cur); bufferModified = true; }
                 else if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) { if (this.selection.active) this.replaceSelection(key); else { buf.insert(cur, key); for (let i = 0; i < key.length; i++) editorRight(win, buf, cur); }; bufferModified = true; }
                 else handled = false;

                  // Update selection if Shift is pressed
                  if (isShiftPressed && (selectionStarted || this.selection.active)) {
                      this.selection.extend(cur.row, cur.col);
                  } else if (!isShiftPressed && this.selection.active && !selectionStarted && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
                      // Don't clear if collapsing selection
                  } else if (!isShiftPressed && this.selection.active) {
                       this.selection.clear();
                   }
             }
        }

        // --- Finalization ---
        if (handled) {
            e.preventDefault();
            if (bufferModified) {
                this.bufferVersion++;
                if (this.wordWrapEnabled) {
                    this.invalidateVisualLayoutCache(); // Crucial for wrap mode
                }
            }
            this.ensureCursorVisible(); // Adjust scroll if necessary *after* cursor move/buffer change
            drawTWidgets(); // Redraw the UI
        } else if (isMetaPressed && (key === 'x' || key === 'c' || key === 'v')) {
             // Handle clipboard case that didn't return earlier
              if (bufferModified) {
                   this.bufferVersion++;
                   if (this.wordWrapEnabled) {
                       this.invalidateVisualLayoutCache();
                   }
              }
             this.ensureCursorVisible();
             drawTWidgets();
             return true; // It was handled
        }
        return handled;
    }

     mouseDown(x, y) {
        // Allow parent (TScrollableWidget) to handle scrollbar clicks first
        // We get scrollbar info via `getVertical/HorizontalScrollbarInfo` which uses `getContentDimensions`
        // which is aware of the wrap state.
         let scrollbarInfo = this.getVerticalScrollbarInfo();
         if (scrollbarInfo && x === this.x + this.w - 2 && y >= this.y + 1 && y < this.y + 1 + scrollbarInfo.trackSize) {
              // Click on vertical scrollbar track/thumb
               if(super.mouseDown(x, y)) return true; // Let TScrollableWidget handle it if needed (though we handle thumb drag start here)
              // Handle track click or start thumb drag in TScrollableWidget/desktop.js based on interactionState
         }
          scrollbarInfo = this.getHorizontalScrollbarInfo();
          if (scrollbarInfo && y === this.y + this.h - 2 && x >= this.x + 1 && x < this.x + 1 + scrollbarInfo.trackSize) {
              // Click on horizontal scrollbar track/thumb
               if(super.mouseDown(x, y)) return true;
          }

         // If not a scrollbar click, proceed with content click handling
         const dims = this.getContentDimensions();
         const relX = x - this.x - 1;
         const relY = y - this.y - 1;

         // Check if click is within content area
         if (relX >= 0 && relX < dims.contentWidth && relY >= 0 && relY < dims.contentHeight) {
             this.resetCursorBlinkTimer();

             let targetLogicalRow, targetLogicalCol;

             if (this.wordWrapEnabled) {
                 // --- Wrapped Mode Click ---
                 const clickedVisualLine = this.visualScrollTop + relY;
                 // Use visual column directly for mapping
                 const mapping = this.mapVisualToLogical(clickedVisualLine, relX);
                 if(mapping){
                     targetLogicalRow = mapping.logicalRow;
                     targetLogicalCol = mapping.logicalCol;
                 } else {
                      // Map failed (e.g., click below content), map to end of buffer
                       const layout = this.getVisualLayout(dims.contentWidth);
                       if (layout.length > 0) {
                           const lastLineInfo = layout[layout.length - 1];
                           targetLogicalRow = lastLineInfo.logicalRow;
                            targetLogicalCol = this.buffer.getLine(targetLogicalRow).length; // End of the logical line
                       } else { // Empty buffer
                            targetLogicalRow = 0;
                            targetLogicalCol = 0;
                       }
                 }

             } else {
                 // --- Non-Wrapped Mode Click ---
                 const win = this.editorWindow;
                 targetLogicalRow = win.row + relY;
                 targetLogicalCol = win.col + relX;

                 // Clamp to buffer bounds (original logic)
                 targetLogicalRow = clamp(targetLogicalRow, 0, this.buffer.bottom);
                 const lineLength = this.buffer.getLine(targetLogicalRow).length;
                 targetLogicalCol = clamp(targetLogicalCol, 0, lineLength);
             }

             // Update cursor position
             this.cursor.row = targetLogicalRow;
             this.cursor.col = targetLogicalCol; // Updates hint

             // Handle selection start (clear existing, start new)
              this.selection.clear();
              this.selection.start(this.cursor.row, this.cursor.col);

              // Prepare for potential drag-selection - InteractionState will manage this
              // The desktop.js mouse down handler should already set interactionState correctly

             this.ensureCursorVisible(); // Make sure cursor is visible after click
             drawTWidgets();
             return true; // Event handled by editor content click
         }

         // Click was outside content area (but inside widget bounds, e.g., border/title)
         // Let desktop.js handle bringing widget to front etc.
         return false;
     }

     extendSelection(x, y) {
         const dims = this.getContentDimensions();
         const widgetTop = this.y + 1;
         const widgetBottom = this.y + 1 + dims.contentHeight;
         const widgetLeft = this.x + 1;
         const widgetRight = this.x + 1 + dims.contentWidth;

         // --- Auto-scroll logic ---
         let scrollVertical = 0;
         let scrollHorizontal = 0; // Only relevant when not wrapped

         // Check for scroll slightly inside the boundary to feel more responsive
         const scrollMargin = 1;
         if (y < widgetTop + scrollMargin) scrollVertical = -1;
         else if (y >= widgetBottom - scrollMargin) scrollVertical = 1;
         if (!this.wordWrapEnabled) {
             if (x < widgetLeft + scrollMargin) scrollHorizontal = -1;
             else if (x >= widgetRight - scrollMargin) scrollHorizontal = 1;
         }

         let scrolled = false;
         if (scrollVertical !== 0) {
            // Use the scroll method which handles clamping and returns if changed
             const currentScroll = this.getVerticalScrollPosition();
             const changed = this.setVerticalScrollPosition(currentScroll + scrollVertical);
              scrolled = changed || scrolled;
         }
          if (scrollHorizontal !== 0 && !this.wordWrapEnabled) {
             const currentScroll = this.getHorizontalScrollPosition();
              const changed = this.setHorizontalScrollPosition(currentScroll + scrollHorizontal);
              scrolled = changed || scrolled;
          }


         // --- Calculate Target Position ---
         // Use raw x,y for calculation relative to widget edges
         const relX = x - (this.x + 1);
         const relY = y - (this.y + 1);

         // Clamp relative positions to content area for mapping
          const clampedRelX = clamp(relX, 0, dims.contentWidth -1);
          const clampedRelY = clamp(relY, 0, dims.contentHeight -1);


         let targetLogicalRow, targetLogicalCol;

         if (this.wordWrapEnabled) {
             // Map potentially out-of-bounds visual coordinate by clamping first
             const targetVisualLine = this.visualScrollTop + clampedRelY;
             const mapping = this.mapVisualToLogical(targetVisualLine, clampedRelX);
              if(mapping) {
                  targetLogicalRow = mapping.logicalRow;
                  targetLogicalCol = mapping.logicalCol;
              } else {
                   // Default to end of buffer if mapping fails during drag
                    targetLogicalRow = this.buffer.bottom;
                    targetLogicalCol = this.buffer.getLine(targetLogicalRow).length;
              }
         } else {
              // Use clamped relative coords to calculate logical target
              targetLogicalRow = this.editorWindow.row + clampedRelY;
              targetLogicalCol = this.editorWindow.col + clampedRelX;
             // Clamp non-wrapped coordinates
             targetLogicalRow = clamp(targetLogicalRow, 0, this.buffer.bottom);
             const lineLength = this.buffer.getLine(targetLogicalRow).length;
             targetLogicalCol = clamp(targetLogicalCol, 0, lineLength);
         }

         // Update cursor position (used as the 'end' of the selection drag)
         const cursorMoved = (this.cursor.row !== targetLogicalRow || this.cursor.col !== targetLogicalCol);
         this.cursor.row = targetLogicalRow;
         this.cursor.col = targetLogicalCol; // Updates hint

         // Extend selection using the logical coordinates
         this.selection.extend(this.cursor.row, this.cursor.col);

         // Return true if scrolled or cursor moved, indicating a redraw is needed
         return scrolled || cursorMoved;
     }

     click(x, y) {
        // Called on mouseUp if it was considered a click
        super.click(x, y);
        // Cursor is already positioned by mouseDown.
        // If we didn't drag significantly (selection start == end), clear selection.
        if (this.selection.active &&
            this.selection.startRow === this.selection.endRow &&
            this.selection.startCol === this.selection.endCol) {
            this.selection.clear();
             drawTWidgets(); // Redraw to show cleared selection
        }
     }


    // --- Other Methods (Clipboard, Focus, etc.) ---

    gainFocus() {
        super.gainFocus();
        this.isCursorBlinking = false; // Ensure cursor appears immediately solid
        this.resetCursorBlinkTimer();
    }

    loseFocus() {
        super.loseFocus();
        clearTimeout(this.cursorBlinkTimer);
        this.cursorBlinkTimer = null;
        this.isCursorBlinking = false; // Ensure cursor is not left blinking
        // Redraw needed if focus lost while blinking
        drawTWidgets();
    }

    destroy() {
        if (this.cursorBlinkTimer) clearTimeout(this.cursorBlinkTimer);
        if (this.selectionAutoScrollTimer) clearInterval(this.selectionAutoScrollTimer);
        this.selectionAutoScrollTimer = null;
        super.destroy();
    }

     resetCursorBlinkTimer() {
        clearTimeout(this.cursorBlinkTimer);
        this.cursorBlinkTimer = null;
        const wasBlinking = this.isCursorBlinking;
        this.isCursorBlinking = false; // Cursor should be solid initially

        if (wasBlinking && this.hasFocus) {
            drawTWidgets(); // Redraw to make it solid if it was blinking
        }

        if (this.hasFocus) {
            // Set timer for the *next* blink state change (to hidden)
            this.cursorBlinkTimer = setTimeout(() => {
                if (!this.hasFocus) return; // Don't blink if focus lost during timeout
                this.isCursorBlinking = true; // Now it's hidden (blinking)
                drawTWidgets(); // Redraw to hide cursor

                // Set timer for the next state change (back to solid)
                 this.cursorBlinkTimer = setTimeout(() => {
                     if (!this.hasFocus) return;
                     this.isCursorBlinking = false; // Back to solid
                     drawTWidgets(); // Redraw to show cursor
                     // Restart the cycle
                     this.resetCursorBlinkTimer();
                 }, CURSOR_BLINK_DELAY / 2); // Time for hidden state

            }, CURSOR_BLINK_DELAY / 2); // Time for solid state
        }
    }

    updateDimensions(w, h) {
        const oldW = this.w;
        const oldH = this.h;
        super.updateDimensions(w, h);

         // Only invalidate and recalculate if dimensions actually changed
        if (this.w !== oldW || this.h !== oldH) {
             if(this.wordWrapEnabled && this.w !== oldW) {
                this.invalidateVisualLayoutCache(); // Width change invalidates layout
            }
            this._updateEditorWindowState(); // Recalculate internal sizes & re-clamp scroll
            this.ensureCursorVisible(); // Ensure cursor is visible after resize
        }
    }

    // --- Clipboard Methods ---
     async copySelectedText() {
         this.debugLog("Starting copy operation");
         if (!this.selection.active ||
             (this.selection.startRow === this.selection.endRow && this.selection.startCol === this.selection.endCol) ) {
             this.debugLog("No active selection to copy");
             return false;
         }
         const selectedText = this.selection.getSelectedText(this.buffer);
         if (!selectedText) return false; // Nothing selected effectively

         this.debugLog(`Copying text: "${selectedText.substring(0,50)}..."`);
         try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(selectedText);
                showStatusMessage("Copied to clipboard", 1500); return true;
            } else {
                 // Fallback to execCommand or internal
                 this.internalClipboard = selectedText; showStatusMessage("Copied internally", 1500); return true;
             }
        } catch (err) {
            console.error("Clipboard copy error:", err);
            this.internalClipboard = selectedText; showStatusMessage("Copied internally (err)", 1500); return true;
         }
     }
     async cutSelectedText() {
         this.debugLog("Starting cut operation");
          if (!this.selection.active ||
              (this.selection.startRow === this.selection.endRow && this.selection.startCol === this.selection.endCol) ) {
                this.debugLog("No active selection to cut");
              return false;
          }
         const copyResult = await this.copySelectedText();
         if (!copyResult) { return false; }
         const deleted = this.deleteSelection(); // Handles bufferVersion/cache/redraw trigger
         if(deleted) showStatusMessage("Cut to clipboard", 1500);
         // deleteSelection should trigger redraw via ensureCursorVisible -> drawTWidgets if needed
         return deleted;
     }
     async pasteText() {
         this.debugLog("Starting paste operation");
         let textToPaste = "";
         try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                textToPaste = await navigator.clipboard.readText();
                this.debugLog(`Pasting text from clipboard API: "${textToPaste.substring(0,50)}..."`);
            } else {
                textToPaste = this.internalClipboard;
                 this.debugLog(`Pasting text from internal: "${textToPaste.substring(0,50)}..."`);
                showStatusMessage("Pasted internally", 1500);
            }
         } catch (err) {
             console.error("Clipboard paste error:", err);
            textToPaste = this.internalClipboard; // Fallback
             this.debugLog(`Pasting text from internal (err): "${textToPaste.substring(0,50)}..."`);
            showStatusMessage("Pasted internally (err)", 1500);
         }

         if (!textToPaste) {
             showStatusMessage("Clipboard empty", 1500);
             return false;
         }

         let success = false;
         if(this.selection.active) {
             success = this.replaceSelection(textToPaste);
         } else {
             success = this.insertTextAtCursor(textToPaste);
         }
         // insert/replace methods handle bufferVersion/cache/redraw trigger
         if(success) showStatusMessage(`Pasted ${textToPaste.length} chars`, 1500);
         return success;
     }

    // --- Editing Methods ---
     deleteSelection() {
         if (!this.selection.active ||
             (this.selection.startRow === this.selection.endRow && this.selection.startCol === this.selection.endCol) ) {
                return false;
          }
         const { startRow, startCol, endRow, endCol } = this.selection.normalizedRange;
         
         // No logging needed

         // Position cursor at start of selection for buffer operations
         this.cursor.row = startRow; this.cursor.col = startCol;

         if (startRow === endRow) { // Single line
             const deleteCount = endCol - startCol;
             for (let i = 0; i < deleteCount; i++) this.buffer.delete(this.cursor);
         } else { // Multi-line
             const beforeSelection = this.buffer.getLine(startRow).substring(0, startCol);
             const afterSelection = this.buffer.getLine(endRow).substring(endCol);
             const resultLine = beforeSelection + afterSelection;
             this.buffer.lines[startRow] = resultLine; // Replace start line
             const linesToRemove = endRow - startRow;
             if (linesToRemove > 0) this.buffer.lines.splice(startRow + 1, linesToRemove); // Remove intermediate/end lines
             // Cursor remains at startRow, startCol
         }
         
         this.selection.clear();
         this.bufferVersion++; // Mark buffer modified
         if (this.wordWrapEnabled) {
             this.invalidateVisualLayoutCache();
         }
         this.ensureCursorVisible(); // Trigger redraw if needed
         return true;
      }
     replaceSelection(newText) {
        // No logging needed
        
        if (!this.selection.active) return this.insertTextAtCursor(newText);
        const deleted = this.deleteSelection(); // Handles bufferVersion/cache/redraw trigger
        // deleteSelection leaves cursor at the start of where selection was
        if (!deleted && !(this.selection.startRow === this.selection.endRow && this.selection.startCol === this.selection.endCol)) {
            // If deletion failed but there *was* a selection range, still try to insert? Maybe not.
             return false;
        }
        // Now insert the new text
        return this.insertTextAtCursor(newText); // Handles bufferVersion/cache/redraw trigger
     }
     insertTextAtCursor(text) {
         if (!text && text !== "") return false; // Allow inserting empty string? No.

         const lines = text.split('\n');
         const win = this.editorWindow; // Still needed for editorRight
         const buf = this.buffer;
         const cur = this.cursor;

         // Insert first line part
         if(lines[0].length > 0) {
             buf.insert(cur, lines[0]);
             for (let i = 0; i < lines[0].length; i++) {
                 editorRight(win, buf, cur); // Use logical move
             }
         }

         // Handle subsequent lines (newlines)
         for (let i = 1; i < lines.length; i++) {
             buf.split(cur); // Split line at cursor
             editorRight(win, buf, cur); // Move to start of new line
             if (lines[i].length > 0) { // Insert content of the new line
                 buf.insert(cur, lines[i]);
                 for (let j = 0; j < lines[i].length; j++) editorRight(win, buf, cur);
             }
         }
         
         this.bufferVersion++; // Mark buffer modified
         if (this.wordWrapEnabled) {
             this.invalidateVisualLayoutCache();
         }
         this.ensureCursorVisible(); // Trigger redraw if needed
         return true;
     }
} // End of TEditorWidget class