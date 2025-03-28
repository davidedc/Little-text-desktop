// --- Constants ---

// Window dimensions
const Y_TO_X_CHARS_DIMENSIONS_RATIO = 1.6;
const DEFAULT_WINDOW_WIDTH_chars = 35;
const DEFAULT_WINDOW_HEIGHT_chars = 15;
const MIN_WINDOW_WIDTH_chars = 10;
const MIN_WINDOW_HEIGHT_chars = 5;
const STATUS_WINDOW_HEIGHT_chars = 3;

// Clock widget constants
const CLOCK_HEIGHT_chars = 12;
const CLOCK_WIDTH_chars = Math.round(CLOCK_HEIGHT_chars * Y_TO_X_CHARS_DIMENSIONS_RATIO);
const CLOCK_UPDATE_INTERVAL_ms = 1000;

// UI elements
const LIGHT_SHADE = '░';
const MEDIUM_SHADE = '▒';
const SCROLL_BAR_WIDTH_chars = 1;
const CURSOR_BLINK_DELAY = 800;

// Sample text
const loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris " +
    "nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in " +
    "reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla " +
    "pariatur. Excepteur sint occaecat cupidatat non proident, sunt in " +
    "culpa qui officia deserunt mollit anim id est laborum.";

// --- Main application logic
let tWidgets = [];
let activeWidget = null;
let statusWidget = null;
let GRID_WIDTH_chars, GRID_HEIGHT_chars;
let charWidth_px, charHeight_px;
let clockUpdateInterval = null;
let menuWidget;
let charactersGridElement;

// Get random coordinates for a new widget, ensuring it fits within grid bounds
function getRandomCoordinates(widgetWidth, widgetHeight) {
    const maxX = Math.max(0, GRID_WIDTH_chars - widgetWidth - 1);
    const maxY = Math.max(0, GRID_HEIGHT_chars - widgetHeight - STATUS_WINDOW_HEIGHT_chars - 1);
    const posX = Math.floor(Math.random() * maxX);
    const posY = Math.floor(Math.random() * maxY);
    return { x: posX, y: posY };
}

// Create a new text editor widget at random position
function createEditor() {
    const { x, y } = getRandomCoordinates(DEFAULT_WINDOW_WIDTH_chars + 5, DEFAULT_WINDOW_HEIGHT_chars + 5);
    const width = DEFAULT_WINDOW_WIDTH_chars + 5;
    const height = DEFAULT_WINDOW_HEIGHT_chars + 5;
    const title = `Editor ${tWidgets.filter(w => w instanceof TEditorWidget).length + 1}`;
    const initialText = `Welcome to TEditorWidget!\n\n` +
        `- Use Arrow Keys to move.\n` +
        `- Type characters to insert.\n` +
        `- Backspace/Delete to remove text.\n` +
        `- Enter to split lines.\n` +
        `- Mouse wheel scrolls vertically.\n` +
        `- Click to position cursor.\n\n` +
        loremIpsum.substring(0, 200) + "...";

    const editor = new TEditorWidget(x, y, width, height, title, initialText);
    tWidgets.push(editor);
    bringToFrontAndFocus(editor);
    drawTWidgets();
}

// Create a new clock widget at random position
function createClock() {
    const { x, y } = getRandomCoordinates(CLOCK_WIDTH_chars, CLOCK_HEIGHT_chars);
    const clock = new TClockWidget(x, y, CLOCK_WIDTH_chars, CLOCK_HEIGHT_chars);
    tWidgets.push(clock);
    bringToFrontAndFocus(clock);
    clock.update();
    
    // Start clock update interval if not already running
    if (typeof clockUpdateInterval === 'undefined' || !clockUpdateInterval) {
        clockUpdateInterval = setInterval(updateClocks, CLOCK_UPDATE_INTERVAL_ms);
    }
    drawTWidgets();
}

// Update all clock widgets in the system
function updateClocks() {
    let needsRedraw = false;
    tWidgets.forEach(widget => {
        if (widget instanceof TClockWidget) {
            widget.update();
            needsRedraw = true;
        }
    });
    if (needsRedraw) drawTWidgets();
}

// Create a new text view widget at random position
function createTextWidget() {
    const { x, y } = getRandomCoordinates(DEFAULT_WINDOW_WIDTH_chars, DEFAULT_WINDOW_HEIGHT_chars);
    const width = DEFAULT_WINDOW_WIDTH_chars;
    const height = DEFAULT_WINDOW_HEIGHT_chars;
    const title = `TextView ${tWidgets.filter(w => w instanceof TTextViewWidget && !(w instanceof TStatusWidget)).length + 1}`;
    const content = loremIpsum;

    const textView = new TTextViewWidget(x, y, width, height, title, content);
    tWidgets.push(textView);
    bringToFrontAndFocus(textView);
    drawTWidgets();
}

// Create the status widget at the bottom of the screen if it doesn't exist
function createStatusTWidget() {
    if (statusWidget) return;
    const height = STATUS_WINDOW_HEIGHT_chars;
    statusWidget = new TStatusWidget(0, GRID_HEIGHT_chars - height, GRID_WIDTH_chars, height);
    tWidgets.unshift(statusWidget);
}

// Show a message in the status widget
function showStatusMessage(message) {
    if (statusWidget) {
        const changed = statusWidget.setMessage(message);
        if (changed) drawTWidgets();
    }
}

// Clear the status message
function hideStatusMessage() {
    showStatusMessage("");
}

// Create either a clock or text widget based on current widget count
function createRandomTWidget() {
    const choice = tWidgets.length % 3;
    if (choice === 0) {
        createClock();
    } else if (choice === 1) {
        createTextWidget();
    } else {
        createEditor();
    }
}

/** 
 * Redraws all widgets onto the character grid.
 * Clears the grid, draws each widget in order.
 */
function drawTWidgets() {
    // Create empty character grid with Cell objects
    let characterGrid = Array(GRID_HEIGHT_chars)
        .fill(null)
        .map(() => Array(GRID_WIDTH_chars).fill(null).map(() => new Cell(' ')));

    // Draw each widget
    tWidgets.forEach((widget, widgetIndex) => {
        const isTopWidget = (widget === activeWidget) || widgetIndex === tWidgets.length - 1;
        widget.draw(characterGrid, isTopWidget);
    });

    emitHTML(characterGrid);
}

/**
 * Finds the topmost widget at the given character coordinates.
 * Searches widgets from top to bottom in the drawing order.
 */
function findWidgetAt(mouseX_chars, mouseY_chars) {
    // Search widgets from top to bottom
    for (let widgetIndex = tWidgets.length - 1; widgetIndex >= 0; widgetIndex--) {
        const widget = tWidgets[widgetIndex];
        
        // Calculate widget boundaries
        const widgetStartX = widget.x;
        const widgetEndX = widget.x + widget.w;
        const widgetStartY = widget.y; 
        const widgetEndY = widget.y + widget.h;

        // Check if coordinates are within widget bounds
        const isXWithinBounds = mouseX_chars >= widgetStartX && mouseX_chars < widgetEndX;
        const isYWithinBounds = mouseY_chars >= widgetStartY && mouseY_chars < widgetEndY;

        if (isXWithinBounds && isYWithinBounds) {
            return { widget: widget, index: widgetIndex };
        }
    }
    return null;
}

/** 
 * Sets the currently active widget, handling focus gain/loss.
 * @param {TWidget} widget - The widget to make active
 */
function setActiveWidget(widget) {
    const oldWidget = activeWidget;
    if (oldWidget === widget) return;

    // Remove focus from previous active widget
    if (oldWidget) {
        oldWidget.loseFocus();
    }

    // Set and focus new active widget
    activeWidget = widget;
    if (activeWidget) {
        activeWidget.gainFocus();
    }
}

/** 
 * Moves a widget to the end of the array (drawing order) and sets focus.
 * This makes the widget appear on top and become active.
 * @param {TWidget} widget - The widget to bring to front and focus
 */
function bringToFrontAndFocus(widget) {
    if (!widget) return;

    // Only move if not already at end
    const index = tWidgets.indexOf(widget);
    if (index > -1 && index < tWidgets.length - 1) {
        tWidgets.splice(index, 1);
        tWidgets.push(widget);
    }

    setActiveWidget(widget);
}

/**
 * Moves a widget to the end of the array (drawing order) without changing focus.
 * This makes the widget appear on top but does not make it active.
 * @param {TWidget} widget - The widget to bring to front
 */
function bringToFront(widget) {
    if (!widget) return;

    // Only move if not already at end
    const index = tWidgets.indexOf(widget);
    if (index > -1 && index < tWidgets.length - 1) {
        tWidgets.splice(index, 1); 
        tWidgets.push(widget);
    }
}

// --- Event Handlers ---

/**
 * Main mouse down handler - determines the type of interaction and delegates to specific handlers
 */
function handleMouseDown(e) {
    // Get mouse coordinates in character units
    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    const result = findWidgetAt(mouseX_chars, mouseY_chars);
    
    // Reset interaction state
    interactionState.reset();

    if (result) {
        const { widget } = result;
        
        // Start with assumption this is a simple click
        interactionState.startClick(widget, mouseX_chars, mouseY_chars);
        
        // Bring widget to front if not already active
        if (widget !== activeWidget) {
            bringToFrontAndFocus(widget);
            drawTWidgets();
        }

        // Calculate relative coordinates within widget
        const innerX = mouseX_chars - widget.x;
        const innerY = mouseY_chars - widget.y;
        
        // Check for different interaction types in priority order
        if (tryHandleCloseButton(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
            return;
        }
        if (tryHandleScrollbar(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
            return;
        }
        if (tryHandleResizeHandle(widget, mouseX_chars, mouseY_chars)) {
            return;
        }
        if (tryHandleTitleBarDrag(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
            return;
        }
        if (tryHandleContentDrag(widget, mouseX_chars, mouseY_chars)) {
            return;
        }
        
        // If we get here, it's a normal click that will be handled on mouseup
        // The click state is already set in interactionState
    } else {
        // Clicked on background
        handleBackgroundClick();
    }
}

/**
 * Try to handle click on a widget's close button
 */
function tryHandleCloseButton(widget, mouseX, mouseY, innerX, innerY) {
    const closeX = widget.x + widget.w - 2;
    const isTitleY = (mouseY === widget.y);
    const canClose = (widget !== statusWidget) && !(widget === menuWidget && widget.pinned);
    
    if (canClose && mouseX === closeX && isTitleY && widget.w >= 4) {
        handleCloseButton(widget);
        return true;
    }
    return false;
}

/**
 * Handle click on close button
 */
function handleCloseButton(widget) {
    widget.destroy();
    setActiveWidget(null);
    drawTWidgets();
}

/**
 * Try to handle scrollbar interaction
 */
function tryHandleScrollbar(widget, mouseX, mouseY, innerX, innerY) {
    // Get scrollbar info if widget supports it
    let vScrollInfo = widget.getVerticalScrollbarInfo ? widget.getVerticalScrollbarInfo() : null;
    let hScrollInfo = widget.getHorizontalScrollbarInfo ? widget.getHorizontalScrollbarInfo() : null;

    // Check if clicking vertical scrollbar thumb
    if (vScrollInfo && 
        mouseX === widget.x + widget.w - 2 && 
        innerY > 0 && 
        innerY <= vScrollInfo.trackSize && 
        innerY >= vScrollInfo.thumbPosition && 
        innerY < vScrollInfo.thumbPosition + vScrollInfo.thumbSize) {
        
        startScrollbarDrag(widget, 'vertical', mouseX, mouseY);
        return true;
    }

    // Check if clicking horizontal scrollbar thumb
    if (hScrollInfo && 
        mouseY === widget.y + widget.h - 2 && 
        innerX > 0 && 
        innerX <= hScrollInfo.trackSize && 
        innerX >= hScrollInfo.thumbPosition && 
        innerX < hScrollInfo.thumbPosition + hScrollInfo.thumbSize) {
        
        startScrollbarDrag(widget, 'horizontal', mouseX, mouseY);
        return true;
    }
    
    return false;
}

/**
 * Start scrollbar dragging interaction
 */
function startScrollbarDrag(widget, axis, mouseX, mouseY) {
    const startOffset = (axis === 'vertical') 
        ? ((widget instanceof TEditorWidget) ? widget.editorWindow.row : widget.scrollOffset)
        : ((widget instanceof TEditorWidget) ? widget.editorWindow.col : 0);
        
    interactionState.startScrollDrag(widget, axis, mouseX, mouseY, startOffset);
    showStatusMessage(`Scrolling ${widget.title}...`);
}

/**
 * Try to handle resize handle interaction
 */
function tryHandleResizeHandle(widget, mouseX, mouseY) {
    const resizeX = widget.x + widget.w - 1;
    const resizeY = widget.y + widget.h - 1;
    
    if (mouseX === resizeX && mouseY === resizeY) {
        startWidgetResize(widget, mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Start widget resize interaction
 */
function startWidgetResize(widget, mouseX, mouseY) {
    interactionState.startResize(widget, mouseX, mouseY);
    showStatusMessage("Resizing " + widget.title);
}

/**
 * Try to handle title bar drag interaction
 */
function tryHandleTitleBarDrag(widget, mouseX, mouseY, innerX, innerY) {
    const closeX = widget.x + widget.w - 2;
    const isTitleY = (mouseY === widget.y);
    
    if (isTitleY && mouseX > widget.x && mouseX < closeX) {
        startWidgetDrag(widget, mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Try to handle content area drag for applicable widget types
 */
function tryHandleContentDrag(widget, mouseX, mouseY) {
    if (!(widget instanceof TEditorWidget) && !(widget instanceof TMenuWidget)) {
        startWidgetDrag(widget, mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Start widget drag interaction
 */
function startWidgetDrag(widget, mouseX, mouseY) {
    interactionState.startDrag(widget, mouseX, mouseY, mouseX - widget.x, mouseY - widget.y);
    showStatusMessage("Dragging " + widget.title);
}

/**
 * Handle click on background (outside any widget)
 */
function handleBackgroundClick() {
    if (activeWidget instanceof TMenuWidget && !activeWidget.pinned) {
        activeWidget.closeAll();
        drawTWidgets();
    }
}

/**
 * Main mouse move handler - delegates to specific move handlers based on interaction type
 */
function handleMouseMove(e) {
    // No action if no active interaction
    if (!interactionState.isActive()) return;
    
    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    let needsRedraw = false;

    // Delegate to specific handler based on interaction type
    if (interactionState.isScrolling()) {
        needsRedraw = handleScrollbarDragMove(mouseX_chars, mouseY_chars);
    }
    else if (interactionState.isResizing()) {
        needsRedraw = handleWidgetResizeMove(mouseX_chars, mouseY_chars);
    }
    else if (interactionState.isDragging()) {
        needsRedraw = handleWidgetDragMove(mouseX_chars, mouseY_chars);
    }

    if (needsRedraw) {
        drawTWidgets();
    }
}

/**
 * Handle mouse movement during scrollbar drag
 */
function handleScrollbarDragMove(mouseX, mouseY) {
    const widget = interactionState.targetWidget;
    let scrollInfo = null;
    let mouseDelta = 0;
    let newScrollOffset = 0;

    if (interactionState.axis === 'vertical') {
        scrollInfo = widget.getVerticalScrollbarInfo();
        if (scrollInfo && scrollInfo.trackSize > 0 && scrollInfo.maxScrollOffset > 0) {
            mouseDelta = mouseY - interactionState.startY;
            const offsetPerChar = scrollInfo.maxScrollOffset / Math.max(1, scrollInfo.trackSize - scrollInfo.thumbSize);
            newScrollOffset = interactionState.startOffset + (mouseDelta * offsetPerChar);
            return widget.updateScrollOffset('vertical', newScrollOffset);
        }
    } else if (interactionState.axis === 'horizontal') {
        scrollInfo = widget.getHorizontalScrollbarInfo();
        if (scrollInfo && scrollInfo.trackSize > 0 && scrollInfo.maxScrollOffset > 0) {
            mouseDelta = mouseX - interactionState.startX;
            const offsetPerChar = scrollInfo.maxScrollOffset / Math.max(1, scrollInfo.trackSize - scrollInfo.thumbSize);
            newScrollOffset = interactionState.startOffset + (mouseDelta * offsetPerChar);
            return widget.updateScrollOffset('horizontal', newScrollOffset);
        }
    }
    
    return false;
}

/**
 * Handle mouse movement during widget resize
 */
function handleWidgetResizeMove(mouseX, mouseY) {
    const widget = interactionState.targetWidget;
    
    // Calculate new dimensions while respecting minimums
    const newWidth = Math.max(MIN_WINDOW_WIDTH_chars, mouseX - widget.x + 1);
    const newHeight = Math.max(MIN_WINDOW_HEIGHT_chars, mouseY - widget.y + 1);
    
    // Clamp dimensions to grid boundaries
    const clampedWidth = Math.min(newWidth, GRID_WIDTH_chars - widget.x);
    const clampedHeight = Math.min(newHeight, GRID_HEIGHT_chars - widget.y);
    
    if (widget.w !== clampedWidth || widget.h !== clampedHeight) {
        widget.updateDimensions(clampedWidth, clampedHeight);
        return true;
    }
    
    return false;
}

/**
 * Handle mouse movement during widget drag
 */
function handleWidgetDragMove(mouseX, mouseY) {
    const widget = interactionState.targetWidget;
    
    // Calculate new position using drag offsets
    const newPosX = mouseX - interactionState.offsetX;
    const newPosY = mouseY - interactionState.offsetY;
    
    // Clamp position to keep widget in bounds
    const maxPosY = GRID_HEIGHT_chars - widget.h - STATUS_WINDOW_HEIGHT_chars;
    const clampedPosX = clamp(newPosX, 0, GRID_WIDTH_chars - widget.w);
    const clampedPosY = clamp(newPosY, 0, maxPosY);
    
    if (widget.x !== clampedPosX || widget.y !== clampedPosY) {
        widget.x = clampedPosX;
        widget.y = clampedPosY;
        return true;
    }
    
    return false;
}

/**
 * Main mouse up handler - completes the current interaction
 */
function handleMouseUp(e) {
    // If we're not in the middle of an interaction, nothing to do
    if (!interactionState.isPressed) return;
    
    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    
    // Handle interaction completion based on type
    if (interactionState.isClicking()) {
        handleClickCompletion(mouseX_chars, mouseY_chars);
    } else {
        // For other interaction types, just clean up
        endActiveInteraction();
    }
}

/**
 * Handle the completion of a click interaction
 */
function handleClickCompletion(mouseX, mouseY) {
    const widget = interactionState.targetWidget;
    if (!widget) {
        interactionState.endInteraction();
        return;
    }
    
    const result = findWidgetAt(mouseX, mouseY);
    
    // Only trigger click if mouse up is on the same widget as mouse down
    if (result && result.widget === widget) {
        widget.click(mouseX, mouseY);
        drawTWidgets();
    }
    
    interactionState.endInteraction();
}

/**
 * End the active interaction and clean up
 */
function endActiveInteraction() {
    // Hide status message if we were dragging or resizing
    if (interactionState.isDragging() || interactionState.isResizing() || interactionState.isScrolling()) {
        hideStatusMessage();
    }
    
    interactionState.endInteraction();
}

/**
 * Handles mouse wheel events for scrolling widgets
 */
function handleWheel(e) {
    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    const result = findWidgetAt(mouseX_chars, mouseY_chars);
    
    if (result) {
        const scrolled = result.widget.scroll(Math.sign(e.deltaY));
        if (scrolled) {
            e.preventDefault();
        }
    }
}

/**
 * Handles keyboard events for the active widget
 */
function handleKeyDown(e) {
    if (activeWidget) {
        activeWidget.handleKeyPress(e);
    }
}

// --- Initialization and Drawing ---
/** 
 * Calculates character grid coordinates from pixel coordinates.
 * Converts mouse pixel coordinates relative to the grid element into character-based coordinates.
 */
function getMouseCoords_chars(mouseEvent) {
    const gridRect = charactersGridElement.getBoundingClientRect();
    const { clientX, clientY } = mouseEvent;
    const { left, top } = gridRect;
    
    // Calculate pixel offsets from grid element edge
    const mousePosXInPixels = clientX - left;
    const mousePosYInPixels = clientY - top;
    
    // Convert to character coordinates, defaulting to 0 if dimensions not set
    const mouseX_chars = charWidth_px > 0 ? Math.floor(mousePosXInPixels / charWidth_px) : 0;
    const mouseY_chars = charHeight_px > 0 ? Math.floor(mousePosYInPixels / charHeight_px) : 0;
    
    return { mouseX_chars, mouseY_chars };
}

/** 
 * Renders the character grid array to HTML.
 * Simply renders each cell's content, which may include HTML for styling.
 */
function emitHTML(characterGrid) {
    let htmlOutput = '';
    for (let rowIndex = 0; rowIndex < GRID_HEIGHT_chars; rowIndex++) {
        for (let colIndex = 0; colIndex < GRID_WIDTH_chars; colIndex++) {
            const cell = characterGrid[rowIndex]?.[colIndex] || new Cell(' ');
            htmlOutput += cell.toString();
        }
        htmlOutput += '\n';
    }
    charactersGridElement.innerHTML = htmlOutput;
}

/** 
 * Measures monospace character dimensions by creating a temporary element.
 * Returns character width and height in pixels.
 */
function measureMonospaceFontDimensions(fontSize) {
    const testSpan = document.createElement('span');
    testSpan.style.fontFamily = '"Courier New", "Consolas", "DejaVu Sans Mono", "Liberation Mono", monospace';
    testSpan.style.fontSize = `${fontSize}px`;
    testSpan.style.position = 'absolute';
    testSpan.style.visibility = 'hidden';
    testSpan.style.whiteSpace = 'pre';
    testSpan.textContent = 'MMMMMMMMMM';
    
    document.body.appendChild(testSpan);
    const spanRect = testSpan.getBoundingClientRect();
    document.body.removeChild(testSpan);
    
    const characterWidth = spanRect.width / 10;
    const characterHeight = fontSize;
    
    return {
        charWidth_px: characterWidth > 0 ? characterWidth : 1,
        charHeight_px: characterHeight > 0 ? characterHeight : 1
    };
}

/** Initializes the desktop system. */
function initializeSystem() {
    // Get character grid element
    charactersGridElement = document.getElementById('characters-grid');
    
    // Get font size and measure character dimensions
    const style = window.getComputedStyle(charactersGridElement);
    const fontSize = parseFloat(style.fontSize);
    ({charWidth_px, charHeight_px} = measureMonospaceFontDimensions(fontSize));
    
    updateGridDimensions();
    createStatusTWidget();

    // Create main menu
    const menuItems = [
        {
            label: "Create",
            subMenu: [
                { label: "Editor", callback: createEditor },
                { label: "Clock", callback: createClock },
                { label: "Text View", callback: createTextWidget }
            ]
        },
        { label: "Random widget", callback: createRandomTWidget }
    ];
    const menuWidth = 20;
    const menuHeight = menuItems.length + 2;
    menuWidget = new TMenuWidget(2, 2, menuWidth, menuHeight, "Main Menu", menuItems, true);
    tWidgets.push(menuWidget);

    // Create initial editor and set up event listeners
    createEditor();
    drawTWidgets();

    charactersGridElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    charactersGridElement.addEventListener('wheel', handleWheel, {passive: false});
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    showStatusMessage("System Initialized. Click menu or widgets.");
}

/** Updates global grid dimensions and clamps/resizes widgets if necessary. */
function updateGridDimensions() {
    const gridBounds = charactersGridElement.getBoundingClientRect();
    const newGridWidth = charWidth_px > 0 ? Math.floor(gridBounds.width / charWidth_px) : 0;
    const newGridHeight = charHeight_px > 0 ? Math.floor(gridBounds.height / charHeight_px) : 0;

    if (newGridWidth !== GRID_WIDTH_chars || newGridHeight !== GRID_HEIGHT_chars) {
        GRID_WIDTH_chars = newGridWidth;
        GRID_HEIGHT_chars = newGridHeight;

        // Update status widget position and dimensions
        if (statusWidget) {
            statusWidget.x = 0;
            statusWidget.y = GRID_HEIGHT_chars - STATUS_WINDOW_HEIGHT_chars;
            statusWidget.w = GRID_WIDTH_chars;
            statusWidget.h = STATUS_WINDOW_HEIGHT_chars;
            statusWidget.updateDimensions(statusWidget.w, statusWidget.h);
        }

        // Update all other widgets
        tWidgets.forEach(widget => {
            if (widget === statusWidget) return;

            // Clamp position
            widget.x = clamp(widget.x, 0, GRID_WIDTH_chars - widget.w);
            widget.y = clamp(widget.y, 0, GRID_HEIGHT_chars - widget.h - STATUS_WINDOW_HEIGHT_chars);

            // Adjust dimensions if needed
            const clampedWidgetWidth = Math.min(widget.w, GRID_WIDTH_chars - widget.x);
            const clampedWidgetHeight = Math.min(widget.h, GRID_HEIGHT_chars - widget.y - STATUS_WINDOW_HEIGHT_chars);
            
            if (widget.w !== clampedWidgetWidth || widget.h !== clampedWidgetHeight) {
                widget.updateDimensions(clampedWidgetWidth, clampedWidgetHeight);
            }
        });
        return true;
    }
    return false;
}

/** Handles browser window resize events. */
function handleResize() {
    const dimensionsChanged = updateGridDimensions();
    if (dimensionsChanged) drawTWidgets();
}