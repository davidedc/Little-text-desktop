// --- Constants ---

// Window dimensions
const Y_TO_X_CHARS_DIMENSIONS_RATIO = 1.6;
const DEFAULT_WINDOW_WIDTH_chars = 35;
const DEFAULT_WINDOW_HEIGHT_chars = 15;
const MIN_WINDOW_WIDTH_chars = 10;
const MIN_WINDOW_HEIGHT_chars = 5;
const STATUS_WINDOW_HEIGHT_chars = 3;

// Clock widget constants
const CLOCK_HEIGHT_chars = 14;
const CLOCK_WIDTH_chars = Math.round(CLOCK_HEIGHT_chars * Y_TO_X_CHARS_DIMENSIONS_RATIO);
const CLOCK_UPDATE_INTERVAL_ms = 1000;

// UI elements
const LIGHT_SHADE = '░';
const MEDIUM_SHADE = '▒';
const SCROLL_BAR_WIDTH_chars = 1; // Note: TEditorWidget calculates based on need now
const CURSOR_BLINK_DELAY = 800; // Adjusted from original value for consistency maybe? Check TEditorWidget.

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
let menuWidget; // Main menu
let viewMenuWidget = null; // View menu instance tracker
let charactersGridElement;
let statusMessageTimer = null; // Timer for temporary status messages

// Get random coordinates for a new widget, ensuring it fits within grid bounds
function getRandomCoordinates(widgetWidth, widgetHeight) {
    const maxX = Math.max(0, GRID_WIDTH_chars - widgetWidth - 1);
    const maxY = Math.max(0, GRID_HEIGHT_chars - widgetHeight - STATUS_WINDOW_HEIGHT_chars - 1);
    const posX = Math.floor(Math.random() * maxX);
    const posY = Math.floor(Math.random() * maxY);
    return { x: posX, y: posY };
}

// Create a new text editor widget at random position
function createEditor(wordWrapEnabled = false) {
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
        `- Click to position cursor.\n` +
        `- Select text by dragging mouse.\n`+
        `- Ctrl+C/Cmd+C to Copy.\n`+
        `- Ctrl+X/Cmd+X to Cut.\n`+
        `- Ctrl+V/Cmd+V to Paste.\n\n` +
        loremIpsum.substring(0, 200) + "...";

    const editor = new TEditorWidget(x, y, width, height, title, initialText);
    
    // Enable word wrap if requested
    if (wordWrapEnabled) {
        editor.toggleWordWrap();
    }
    
    tWidgets.push(editor);
    bringToFrontAndFocus(editor);
    drawTWidgets();
}

// Create a new text editor widget with word wrap enabled
function createWrappedEditor() {
    createEditor(true);
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
    tWidgets.unshift(statusWidget); // Keep status widget at the bottom of the drawing stack initially
}

// Show a message in the status widget
/**
 * Show a status message with optional auto-clear
 * @param {string} message Message to display
 * @param {number} duration Duration in ms to show message (0 = permanent)
 */
function showStatusMessage(message, duration = 0) {
    if (!statusWidget) return;

    console.log("Status message:", message);

    // Clear any existing timer
    if (statusMessageTimer) {
        clearTimeout(statusMessageTimer);
        statusMessageTimer = null;
    }

    // Update status message
    const changed = statusWidget.setMessage(message);
    if (changed) drawTWidgets();

    // Auto-clear after duration if specified
    if (duration > 0) {
        statusMessageTimer = setTimeout(() => {
            showStatusMessage(""); // Clear by setting empty message
            statusMessageTimer = null;
        }, duration);
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

// --- View Menu Functionality ---

// Function to create or show the View menu
function createViewMenu() {
     // Close existing view menu if any (or just focus it?)
     if (viewMenuWidget && tWidgets.includes(viewMenuWidget)) {
          bringToFrontAndFocus(viewMenuWidget);
          return;
     }

    const viewMenuItems = [
        // Empty for now - future view options can be added here
    ];
     const menuWidth = 20;
     const menuHeight = viewMenuItems.length + 2;
      // Position it next to the main menu, for example
      const menuX = menuWidget ? menuWidget.x + menuWidget.w -1 : 25;
      const menuY = menuWidget ? menuWidget.y : 2;

     // Ensure menu fits on screen
      const clampedX = clamp(menuX, 0, GRID_WIDTH_chars - menuWidth);
      const clampedY = clamp(menuY, 0, GRID_HEIGHT_chars - menuHeight - STATUS_WINDOW_HEIGHT_chars);


     viewMenuWidget = new TMenuWidget(clampedX, clampedY, menuWidth, menuHeight, "View", viewMenuItems, false, menuWidget); // Not pinned, parent is main menu conceptually
     tWidgets.push(viewMenuWidget);
     bringToFrontAndFocus(viewMenuWidget);
     drawTWidgets();
}


// --- Drawing ---

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
    // Note: Status widget is drawn first (as it's unshifted), others drawn on top
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
    // Search widgets from top to bottom (last in array is topmost visually)
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

    console.log("Mouse down at:", mouseX_chars, mouseY_chars);

    // Reset interaction state
    interactionState.reset();

    if (result) {
        const { widget } = result;
        console.log("Mouse down on widget:", widget.constructor.name);

        // Start with assumption this is a simple click
        interactionState.startClick(widget, mouseX_chars, mouseY_chars);
        console.log("Started click interaction on", widget.constructor.name);

        // Bring widget to front if not already active
        if (widget !== activeWidget) {
            console.log("Bringing to front:", widget.constructor.name);
            bringToFrontAndFocus(widget);
            // Redraw only if focus actually changed something visual (like border/shadow)
            // DrawTWidgets will happen anyway if an interaction starts, or on mouseup
            // drawTWidgets(); // Maybe avoid redraw here for performance?
        }

        // Calculate relative coordinates within widget
        const innerX = mouseX_chars - widget.x;
        const innerY = mouseY_chars - widget.y;
        console.log("Relative position within widget:", innerX, innerY);

        // Check for different interaction types in priority order
        // Status widget cannot be closed/dragged/resized normally
        if (widget !== statusWidget) {
            if (tryHandleCloseButton(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
                console.log("Handled as close button click");
                drawTWidgets(); // Redraw needed after close
                return;
            }
            if (tryHandleResizeHandle(widget, mouseX_chars, mouseY_chars)) {
                console.log("Handled as resize interaction");
                 // Status message set in startWidgetResize
                return;
            }
            // Check for scrollbar *before* title bar drag
             if (tryHandleScrollbar(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
                 console.log("Handled as scrollbar interaction");
                  // Status message set in startScrollbarDrag
                 return;
             }
            if (tryHandleTitleBarDrag(widget, mouseX_chars, mouseY_chars, innerX, innerY)) {
                console.log("Handled as title bar drag");
                 // Status message set in startWidgetDrag
                return;
            }
            // Allow content drag only for non-editors/menus OR if click wasn't handled by mouseDown
             if (!(widget instanceof TEditorWidget) && !(widget instanceof TMenuWidget)) {
                 if (tryHandleContentDrag(widget, mouseX_chars, mouseY_chars)) {
                     console.log("Handled as content drag");
                     return;
                 }
             }
        }


        // Try to handle mouseDown directly using polymorphism (e.g., editor cursor placement)
        console.log("Trying widget mouseDown directly");
        const handledByWidget = widget.mouseDown(mouseX_chars, mouseY_chars);
        if (handledByWidget) {
            console.log("Widget mouseDown handled directly");
            // If the widget handled it (e.g., TEditorWidget placed cursor),
            // the interaction state remains 'click' but the primary action is done.
            // MouseMove might transition it to 'selecting'. MouseUp will finalize.
            // Redraw might have already happened in widget.mouseDown().
            return;
        } else if (widget !== statusWidget && !(widget instanceof TEditorWidget) && !(widget instanceof TMenuWidget)) {
            // If not handled by mouseDown, and it's a draggable type, default to drag
            // This covers clicking in content area of Clock/TextView if not on scrollbar
             if (tryHandleContentDrag(widget, mouseX_chars, mouseY_chars)) {
                console.log("Handled as default content drag after mouseDown miss");
                return;
             }
        }

        // If we get here, it's a normal click (or start of selection) that will be handled on mouseup/mousemove
        console.log("Normal click/selection start will be handled on mouse move/up");
        // The click state is already set in interactionState

    } else {
        console.log("Mouse down on background");
        // Clicked on background
        handleBackgroundClick();
    }
     // Redraw might be needed if focus changed or background click closed menu
     drawTWidgets();
}

/**
 * Try to handle click on a widget's close button
 */
function tryHandleCloseButton(widget, mouseX, mouseY, innerX, innerY) {
    // Use widget properties directly
    const closeButtonX = widget.x + widget.w - 2;
    const isTitleBarY = (mouseY === widget.y);
    // Check if the widget *can* be closed (not status, not pinned menu)
    const canClose = !(widget.isStatusTWidget) && !(widget instanceof TMenuWidget && widget.pinned);

    if (canClose && widget.w >= 4 && mouseX === closeButtonX && isTitleBarY) {
        handleCloseButton(widget); // Handle the closing action
        interactionState.reset(); // Prevent further interaction like drag/click
        return true;
    }
    return false;
}

/**
 * Handle click on close button
 */
function handleCloseButton(widget) {
    widget.destroy(); // Let the widget clean itself up
    // If the closed widget was active, set activeWidget to null
    if (activeWidget === widget) {
        setActiveWidget(null);
    }
    // Redraw happens in the caller (handleMouseDown)
}

/**
 * Try to handle scrollbar interaction
 */
function tryHandleScrollbar(widget, mouseX, mouseY, innerX, innerY) {
    // Get scrollbar info if widget supports it
    let vScrollInfo = widget.getVerticalScrollbarInfo ? widget.getVerticalScrollbarInfo() : null;
    let hScrollInfo = widget.getHorizontalScrollbarInfo ? widget.getHorizontalScrollbarInfo() : null;

    // console.log("Trying scrollbar:",
    //            "Has vertical scrollbar:", !!vScrollInfo,
    //            "Has horizontal scrollbar:", !!hScrollInfo);

    // Check if clicking vertical scrollbar thumb
    if (vScrollInfo &&
        mouseX === widget.x + widget.w - 2 && // Scrollbar column
        innerY >= 1 && innerY < 1 + vScrollInfo.trackSize && // Within vertical track bounds
        innerY >= 1 + vScrollInfo.thumbPosition &&
        innerY < 1 + vScrollInfo.thumbPosition + vScrollInfo.thumbSize) { // On thumb

        console.log("Starting vertical scrollbar drag");
        startScrollbarDrag(widget, 'vertical', mouseX, mouseY);
        return true;
    }

    // Check if clicking horizontal scrollbar thumb
    if (hScrollInfo &&
        mouseY === widget.y + widget.h - 2 && // Scrollbar row
        innerX >= 1 && innerX < 1 + hScrollInfo.trackSize && // Within horizontal track bounds
        innerX >= 1 + hScrollInfo.thumbPosition &&
        innerX < 1 + hScrollInfo.thumbPosition + hScrollInfo.thumbSize) { // On thumb

        console.log("Starting horizontal scrollbar drag");
        startScrollbarDrag(widget, 'horizontal', mouseX, mouseY);
        return true;
    }

    // console.log("Not on scrollbar thumb");
    return false;
}

/**
 * Start scrollbar dragging interaction
 */
function startScrollbarDrag(widget, axis, mouseX, mouseY) {
    // Get the current scroll position to calculate offset later
    const startOffset = (axis === 'vertical')
        ? widget.getVerticalScrollPosition()
        : widget.getHorizontalScrollPosition();

    interactionState.startScrollDrag(widget, axis, mouseX, mouseY, startOffset);
    showStatusMessage(`Scrolling ${widget.title}...`);
}

/**
 * Try to handle resize handle interaction
 */
function tryHandleResizeHandle(widget, mouseX, mouseY) {
    const resizeHandleX = widget.x + widget.w - 1;
    const resizeHandleY = widget.y + widget.h - 1;

    if (mouseX === resizeHandleX && mouseY === resizeHandleY) {
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
    const isTitleBarY = (mouseY === widget.y);
    const closeButtonX = widget.x + widget.w - 2;
    // Allow drag only on title bar, between start and close button (if exists)
    const canDragTitle = widget.w < 4 || (mouseX > widget.x && mouseX < closeButtonX);

    // Check if pinnable menu allows title drag
     const isDraggableMenu = widget instanceof TMenuWidget && !widget.pinned;

    if (isTitleBarY && (canDragTitle || isDraggableMenu)) {
        startWidgetDrag(widget, mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Try to handle content area drag for applicable widget types
 */
function tryHandleContentDrag(widget, mouseX, mouseY) {
    // Allow dragging non-interactive widgets by their content area
    // Exclude status widget, editor, and menus (unless menu is not pinned)
    const isDraggableContent = !(widget.isStatusTWidget) &&
                               !(widget instanceof TEditorWidget) &&
                               !(widget instanceof TMenuWidget && widget.pinned);

    if (isDraggableContent) {
        startWidgetDrag(widget, mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Start widget drag interaction
 */
function startWidgetDrag(widget, mouseX, mouseY) {
    // Calculate offset from mouse click to widget top-left corner
    const offsetX = mouseX - widget.x;
    const offsetY = mouseY - widget.y;
    interactionState.startDrag(widget, mouseX, mouseY, offsetX, offsetY);
    showStatusMessage("Dragging " + widget.title);
}

/**
 * Handle click on background (outside any widget)
 */
function handleBackgroundClick() {
    // Close main menu submenus if not pinned
    if (activeWidget instanceof TMenuWidget && !activeWidget.pinned) {
        // If it's the view menu, just close it
        if (activeWidget === viewMenuWidget) {
             activeWidget.closeAll(); // closeAll includes destroy()
             viewMenuWidget = null; // Clear reference
        } else {
             // If it's a submenu of the main menu, close up to pinned parent
              let current = activeWidget;
              while(current && !current.pinned) {
                  const parent = current.parentMenu;
                  current.closeAll();
                  current = parent;
              }
               if(current) setActiveWidget(current); // Focus parent?
               else setActiveWidget(null);
        }
        // Redraw happens in caller (handleMouseDown)
    }
     // Also close the view menu if it's open but not active and we click background
     else if (viewMenuWidget && tWidgets.includes(viewMenuWidget) && activeWidget !== viewMenuWidget) {
          viewMenuWidget.closeAll(); // Includes destroy
          viewMenuWidget = null;
          // Redraw happens in caller
     } else if (activeWidget && activeWidget !== statusWidget && activeWidget !== menuWidget) {
          // Deselect current widget if clicking background
           //setActiveWidget(null); // Optional: deselect widget on background click
           // drawTWidgets();
     }
}

/**
 * Main mouse move handler - delegates to specific move handlers based on interaction type
 */
function handleMouseMove(e) {
    // Only process if mouse button is potentially down
    if (e.buttons === 0 && !interactionState.isPressed) {
        // Check if we were in an interaction that ended unexpectedly (e.g., mouse up outside window)
        if (interactionState.isActive() || interactionState.isClicking() || interactionState.isSelecting()) {
            console.log("Mouse button released outside, ending interaction.");
            endActiveInteraction(); // Clean up state
             // Handle potential selection end
             const widget = interactionState.targetWidget;
             if (widget instanceof TEditorWidget && widget.selectionAutoScrollTimer) {
                clearInterval(widget.selectionAutoScrollTimer);
                 widget.selectionAutoScrollTimer = null;
             }
             interactionState.reset(); // Fully reset
             drawTWidgets();
        }
        return;
    }


    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    let needsRedraw = false;

    // Handle text selection (when mouse is pressed during 'click' or 'selecting' state)
    if (interactionState.isClicking() || interactionState.isSelecting()) {
        const widget = interactionState.targetWidget;

        // Check if it's an editor widget that can handle selection
        if (widget instanceof TEditorWidget) {
            // If we're just clicking, transition to selecting mode
            if (interactionState.isClicking()) {
                // Re-use start coords from the 'click' state
                interactionState.startSelecting(widget, interactionState.startX, interactionState.startY);
                 // Ensure selection starts at the initial click point in the editor logic
                 // The mouseDown handler should have set the initial cursor/selection start
            }

            // Extend the selection to the current mouse position
            needsRedraw = widget.extendSelection(mouseX_chars, mouseY_chars);

            if (needsRedraw) {
                // Continuous auto-scroll on selection drag
                // Debouncing happens implicitly by mousemove event frequency
                 // Simple immediate redraw on mousemove seems okay for now
                 drawTWidgets();
            }
             // Store last mouse position for potential timer-based scrolling if implemented later
              widget.lastMouseX = mouseX_chars;
              widget.lastMouseY = mouseY_chars;

            return; // Skip other handlers if selecting
        }
    }

    // No action for other interactions if not active
    if (!interactionState.isActive()) return;

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
    let changed = false;

    if (interactionState.axis === 'vertical') {
        scrollInfo = widget.getVerticalScrollbarInfo();
        if (scrollInfo && scrollInfo.trackSize > 0 && scrollInfo.maxScrollOffset >= 0) { // Allow maxScrollOffset 0
            mouseDelta = mouseY - interactionState.startY;
             // Calculate scroll amount based on relative track movement
             const trackTravel = Math.max(1, scrollInfo.trackSize - scrollInfo.thumbSize);
             const scrollPerPixel = scrollInfo.maxScrollOffset / trackTravel;
             newScrollOffset = interactionState.startOffset + (mouseDelta * scrollPerPixel);
             // Use widget's method to update and clamp
             changed = widget.setVerticalScrollPosition(newScrollOffset);
        }
    } else if (interactionState.axis === 'horizontal') {
        scrollInfo = widget.getHorizontalScrollbarInfo();
        if (scrollInfo && scrollInfo.trackSize > 0 && scrollInfo.maxScrollOffset >= 0) {
            mouseDelta = mouseX - interactionState.startX;
             const trackTravel = Math.max(1, scrollInfo.trackSize - scrollInfo.thumbSize);
             const scrollPerPixel = scrollInfo.maxScrollOffset / trackTravel;
             newScrollOffset = interactionState.startOffset + (mouseDelta * scrollPerPixel);
             changed = widget.setHorizontalScrollPosition(newScrollOffset);
        }
    }

    return changed; // Return true if scroll position actually changed
}

/**
 * Handle mouse movement during widget resize
 */
function handleWidgetResizeMove(mouseX, mouseY) {
    const widget = interactionState.targetWidget;

    // Calculate new dimensions based on mouse position relative to widget origin
    const newWidth = Math.max(MIN_WINDOW_WIDTH_chars, mouseX - widget.x + 1);
    const newHeight = Math.max(MIN_WINDOW_HEIGHT_chars, mouseY - widget.y + 1);

    // Clamp dimensions to grid boundaries
    const clampedWidth = Math.min(newWidth, GRID_WIDTH_chars - widget.x);
    // Ensure height doesn't overlap status bar (unless it IS the status bar)
    const maxAllowedY = GRID_HEIGHT_chars - (widget === statusWidget ? 0 : STATUS_WINDOW_HEIGHT_chars);
    const clampedHeight = Math.min(newHeight, maxAllowedY - widget.y);


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

    // Calculate new potential top-left position using drag offsets
    const newPosX = mouseX - interactionState.offsetX;
    const newPosY = mouseY - interactionState.offsetY;

    // Clamp position to keep widget within grid bounds
    const clampedPosX = clamp(newPosX, 0, GRID_WIDTH_chars - widget.w);
    // Ensure widget stays above status bar (unless it IS status bar)
    const maxPosY = GRID_HEIGHT_chars - widget.h - (widget === statusWidget ? 0 : STATUS_WINDOW_HEIGHT_chars);
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
    if (!interactionState.isPressed) {
        // This check might be redundant if mousemove handles button release properly
        console.log("Mouse up: No interaction in progress");
        return;
    }

    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    console.log("Mouse up at:", mouseX_chars, mouseY_chars,
                "Type:", interactionState.type,
                "Target:", interactionState.targetWidget?.constructor.name);

    // Clean up selection auto-scroll timer if it exists (though timer approach removed for now)
    const widget = interactionState.targetWidget;
    if (widget instanceof TEditorWidget && widget.selectionAutoScrollTimer) {
        clearInterval(widget.selectionAutoScrollTimer);
        widget.selectionAutoScrollTimer = null;
        console.log("Cleared selection auto-scroll timer");
    }

    // Handle interaction completion based on type
    if (interactionState.isClicking()) {
        console.log("Handling click completion");
        // Find widget at mouse *up* position
         const result = findWidgetAt(mouseX_chars, mouseY_chars);
          // Only trigger click if mouse up is on the same widget as mouse down
          if (result && result.widget === interactionState.targetWidget) {
              console.log("Forwarding click to widget:", result.widget.constructor.name);
              result.widget.click(mouseX_chars, mouseY_chars); // Call widget's click handler
          } else {
               console.log("Click ended outside original widget or on background");
          }
         // Click always ends the interaction state
         endActiveInteraction();

    } else if (interactionState.isSelecting()) {
        console.log("Ending selection interaction");
        // Selection state is maintained in TEditorWidget's selection object.
        // Just end the interaction tracking state.
         endActiveInteraction();
         // Redraw might be needed if selection state changed visually on mouseup (e.g., finalized highlight)
         // The TEditorWidget click handler might clear selection if it was just a point click.
         drawTWidgets();

    } else {
        console.log("Ending non-click interaction:", interactionState.type);
        // For drag, resize, scroll, just clean up interaction state and status message.
        endActiveInteraction();
        // Redraw needed to show final position/size/scroll
         drawTWidgets();
    }
}


/**
 * End the active interaction and clean up
 */
function endActiveInteraction() {
    // Hide status message if we were dragging, resizing, or scrolling
    if (interactionState.isDragging() || interactionState.isResizing() || interactionState.isScrolling()) {
        hideStatusMessage();
    }

    interactionState.endInteraction(); // Mark interaction as not pressed
    // Keep other state like targetWidget until next interaction starts or explicit reset
}

/**
 * Handles mouse wheel events for scrolling widgets
 */
function handleWheel(e) {
    const { mouseX_chars, mouseY_chars } = getMouseCoords_chars(e);
    const result = findWidgetAt(mouseX_chars, mouseY_chars);

    if (result && result.widget.scroll) { // Check if widget has a scroll method
        // Use scroll method which should handle clamping and return true if scrolled
        const scrolled = result.widget.scroll(Math.sign(e.deltaY));
        if (scrolled) {
            e.preventDefault(); // Prevent default browser page scroll
             drawTWidgets(); // Redraw needed after scroll
        }
    }
}

/**
 * Handles keyboard events for the active widget
 */
function handleKeyDown(e) {
    // Debug logging for all key events
    console.log(`Key pressed: key=${e.key}, code=${e.code}, altKey=${e.altKey}, ctrlKey=${e.ctrlKey}, metaKey=${e.metaKey}`);
    
    if (activeWidget) {
        console.log(`Active widget: ${activeWidget.title}, type: ${activeWidget.constructor.name}`);
        // Let the widget handle the key press
        // The widget's handler should call e.preventDefault() if it uses the key
        // and trigger drawTWidgets() if redraw is needed
        const handled = activeWidget.handleKeyPress(e);
        console.log(`Widget handled key: ${handled}`);
    } else if (e.key === 'Escape' && viewMenuWidget && tWidgets.includes(viewMenuWidget)) {
         // If no widget is active, but view menu is open, Escape closes it
         viewMenuWidget.closeAll(); // Includes destroy
         viewMenuWidget = null;
         drawTWidgets();
         e.preventDefault();
    } else {
        console.log('No active widget to handle key event');
    }
    // Add global shortcuts here if needed (e.g., Alt+Tab for cycling widgets)
}

// --- Initialization and Drawing ---
/**
 * Calculates character grid coordinates from pixel coordinates.
 * Converts mouse pixel coordinates relative to the grid element into character-based coordinates.
 */
function getMouseCoords_chars(mouseEvent) {
    const gridRect = charactersGridElement.getBoundingClientRect();
    // Use clientX/Y for coordinates relative to the viewport
    const { clientX, clientY } = mouseEvent;
    // Get the grid's position relative to the viewport
    const { left, top } = gridRect;

    // Calculate pixel offsets from grid element top-left edge
    const mousePosXInPixels = clientX - left;
    const mousePosYInPixels = clientY - top;

    // Convert to character coordinates, defaulting to 0 if dimensions not set
    // Ensure we don't divide by zero if dimensions are somehow 0
    const mouseX_chars = charWidth_px > 0 ? Math.floor(mousePosXInPixels / charWidth_px) : 0;
    const mouseY_chars = charHeight_px > 0 ? Math.floor(mousePosYInPixels / charHeight_px) : 0;

    // Clamp coordinates to be within the grid bounds
     const clampedX = clamp(mouseX_chars, 0, GRID_WIDTH_chars - 1);
     const clampedY = clamp(mouseY_chars, 0, GRID_HEIGHT_chars - 1);


    return { mouseX_chars: clampedX, mouseY_chars: clampedY };
}

/**
 * Renders the character grid array to HTML.
 * Uses the Cell object's toString() method which handles HTML escaping or direct HTML content.
 */
function emitHTML(characterGrid) {
    let htmlOutput = '';
    for (let rowIndex = 0; rowIndex < GRID_HEIGHT_chars; rowIndex++) {
        for (let colIndex = 0; colIndex < GRID_WIDTH_chars; colIndex++) {
            // Ensure we have a valid Cell object, default to space if out of bounds somehow
            const cell = characterGrid[rowIndex]?.[colIndex] || new Cell(' ');
            htmlOutput += cell.toString(); // Cell handles its own rendering (escaped char or HTML span)
        }
        htmlOutput += '\n'; // Newline for preformatted text in HTML
    }
    charactersGridElement.innerHTML = htmlOutput;
}

/**
 * Measures monospace character dimensions by creating a temporary element.
 * Returns character width and height in pixels.
 */
function measureMonospaceFontDimensions(fontSize) {
    const testSpan = document.createElement('span');
    // Use the same font stack as defined in CSS
    testSpan.style.fontFamily = '"Courier New", "Consolas", "DejaVu Sans Mono", "Liberation Mono", monospace';
    testSpan.style.fontSize = `${fontSize}px`;
    testSpan.style.position = 'absolute';
    testSpan.style.visibility = 'hidden';
    testSpan.style.whiteSpace = 'pre'; // Crucial for accurate width measurement
    testSpan.textContent = 'MMMMMMMMMM'; // Use 'M' as it's typically one of the widest chars

    document.body.appendChild(testSpan);
    const spanRect = testSpan.getBoundingClientRect();
    document.body.removeChild(testSpan);

    // Calculate average width over 10 characters
    const characterWidth = spanRect.width / 10;
    // Height is trickier, line-height might affect it.
    // Using fontSize directly is often close enough for monospace fonts with line-height: 1.
    // For more accuracy, measure a multi-line element, but fontSize is simpler here.
    const characterHeight = fontSize; // Approximation based on font size

    // Ensure non-zero dimensions
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

    // Initial grid dimension calculation
    updateGridDimensions(); // Calculates GRID_WIDTH_chars, GRID_HEIGHT_chars
    // Status widget needs grid dimensions, so create it after first update
    createStatusTWidget();

    // Create main menu
    const menuItems = [
        {
            label: "Create",
            subMenu: [
                { label: "Editor", callback: createEditor },
                { label: "Wrapped Editor", callback: createWrappedEditor },
                { label: "Clock", callback: createClock },
                { label: "Text View", callback: createTextWidget }
            ]
        },
        { label: "Random widget", callback: createRandomTWidget }
    ];
    const menuWidth = 20;
    const menuHeight = menuItems.length + 2;
    menuWidget = new TMenuWidget(2, 2, menuWidth, menuHeight, "Main Menu", menuItems, true); // Pinned main menu
    tWidgets.push(menuWidget);

    // Create initial editor and set up event listeners
    createEditor(); // Creates the first editor

    // Debug logging disabled

    // Initial draw
    drawTWidgets();

    // Attach event listeners
    charactersGridElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // Use window for mousemove/up to capture outside releases
    window.addEventListener('mouseup', handleMouseUp);
    charactersGridElement.addEventListener('wheel', handleWheel, {passive: false}); // Need passive:false to preventDefault
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    showStatusMessage("System Initialized. Click menu or widgets.", 5000); // Show for 5 seconds
}

/** Updates global grid dimensions and clamps/resizes widgets if necessary. */
function updateGridDimensions() {
    if (!charactersGridElement || !charWidth_px || !charHeight_px) return false; // Guard against early calls

    const gridBounds = charactersGridElement.getBoundingClientRect();
    // Calculate new dimensions based on current element size and char size
    const newGridWidth = charWidth_px > 0 ? Math.floor(gridBounds.width / charWidth_px) : 0;
    const newGridHeight = charHeight_px > 0 ? Math.floor(gridBounds.height / charHeight_px) : 0;

    if (newGridWidth !== GRID_WIDTH_chars || newGridHeight !== GRID_HEIGHT_chars) {
        GRID_WIDTH_chars = newGridWidth;
        GRID_HEIGHT_chars = newGridHeight;

        console.log(`Grid resized to: ${GRID_WIDTH_chars}x${GRID_HEIGHT_chars}`);

        // Update status widget position and dimensions first
        if (statusWidget) {
            statusWidget.x = 0;
            statusWidget.y = GRID_HEIGHT_chars - STATUS_WINDOW_HEIGHT_chars;
            statusWidget.w = GRID_WIDTH_chars;
            statusWidget.h = STATUS_WINDOW_HEIGHT_chars;
            // Call updateDimensions to allow internal adjustments if needed
            statusWidget.updateDimensions(statusWidget.w, statusWidget.h);
        }

        // Update all other widgets
        tWidgets.forEach(widget => {
            if (widget === statusWidget) return; // Skip status widget, already handled

            // Calculate max allowed Y position for widget's top edge
             const maxAllowedY = GRID_HEIGHT_chars - widget.h - STATUS_WINDOW_HEIGHT_chars;

            // Clamp position first
            widget.x = clamp(widget.x, 0, GRID_WIDTH_chars - widget.w);
            widget.y = clamp(widget.y, 0, maxAllowedY);

            // Adjust dimensions if widget now exceeds boundaries
            const clampedWidgetWidth = Math.min(widget.w, GRID_WIDTH_chars - widget.x);
            const clampedWidgetHeight = Math.min(widget.h, GRID_HEIGHT_chars - widget.y - STATUS_WINDOW_HEIGHT_chars);

            // Update widget dimensions if they changed due to clamping
            if (widget.w !== clampedWidgetWidth || widget.h !== clampedWidgetHeight) {
                 // Call updateDimensions to allow widget to handle internal recalculations
                 widget.updateDimensions(clampedWidgetWidth, clampedWidgetHeight);
            }
        });
        return true; // Dimensions changed
    }
    return false; // No change
}

/** Handles browser window resize events. */
function handleResize() {
    // Re-measure character dimensions in case font size changed via browser zoom etc.
    // This might be overkill if font-size is fixed, but safer.
    const style = window.getComputedStyle(charactersGridElement);
    const fontSize = parseFloat(style.fontSize);
    ({charWidth_px, charHeight_px} = measureMonospaceFontDimensions(fontSize));

    // Update grid dimensions and adjust widgets
    const dimensionsChanged = updateGridDimensions();
    if (dimensionsChanged) {
         // Redraw everything if dimensions changed
         drawTWidgets();
    }
}

// Ensure the interactionState instance is available globally if needed elsewhere,
// though it's primarily used within desktop.js event handlers.
// const interactionState = new InteractionState(); // Already instantiated in its own file