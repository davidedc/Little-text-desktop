# ASCII Desktop System Documentation

## Introduction

The ASCII desktop environment is built using HTML, CSS, and JavaScript. It simulates a graphical desktop environment within a web browser, rendering widgets using text characters in a fixed-width grid. It features movable, resizable widgets like a text editor, a clock, a text viewer, a status bar, and a menu system.

## Initialization

**Initialization (`initializeSystem` in `js/desktop.js`):**
    *   The `main.js` script calls `initializeSystem()` once the page is ready.
    *   It identifies the main `#characters-grid` HTML element.
    *   It measures the pixel dimensions of a single character based on the applied CSS font style (`measureMonospaceFontDimensions`).
    *   It calculates the total grid dimensions in characters (`GRID_WIDTH_chars`, `GRID_HEIGHT_chars`) based on the container size and character size.
    *   It creates essential starting widgets: `TStatusWidget` (at the bottom), `TMenuWidget` (main menu), and an initial `TEditorWidget`. Widgets are stored in the `tWidgets` array.
    *   It attaches event listeners (`mousedown`, `mousemove`, `mouseup`, `wheel`, `keydown`, `resize`) to the appropriate DOM elements (mostly the grid or the window).
    *   It performs the first full render by calling `drawTWidgets()`.


## High-Level Interaction Loop

The system operates on an event-driven model combined with interval-based updates for specific widgets (like the clock).


1.  **Event Handling (User Input):**
    *   The system waits for user interactions (mouse clicks, keyboard presses, window resizing).
    *   Relevant event handlers in `desktop.js` (`handleMouseDown`, `handleKeyDown`, `handleResize`, etc.) are triggered.
    *   These handlers determine the context of the event (e.g., which widget was clicked, which key was pressed, new window size).
    *   They update the system's state, which includes:
        *   The currently focused widget (`activeWidget`).
        *   The state of mouse interactions (`interactionState` object: dragging, resizing, clicking, selecting).
        *   Widget properties (position `x, y`, size `w, h`).
        *   Widget-specific content (e.g., text in `TEditorWidget`).
    *   After processing the event and updating the state, the handler typically calls `drawTWidgets()` to reflect the changes visually.

2.  **Interval Updates (Clock):**
    *   When the first `TClockWidget` is created, a `setInterval` timer (`clockUpdateInterval`) is started (`createClock` in `desktop.js`).
    *   This timer periodically calls the `updateClocks` function.
    *   `updateClocks` iterates through all widgets in `tWidgets`, finds any `TClockWidget` instances, and calls their `update()` method.
    *   The clock widget's `update()` method gets the current time and stores it internally.
    *   If any clock widget was updated, `updateClocks` calls `drawTWidgets()` to refresh the display.

3.  **Rendering (`drawTWidgets` in `js/desktop.js`):**
    *   This function is the core of the visual update process.
    *   It creates a new, blank 2D array (`characterGrid`) representing the entire character grid. Each cell in this array is initialized as a `Cell` object (`js/utils/Cell.js`) containing a space character.
    *   It iterates through the `tWidgets` array. The order of widgets in this array determines their Z-index (widgets later in the array are drawn on top).
    *   For each widget, it calls the widget's `draw(characterGrid, isTopWidget)` method.
    *   The widget's `draw()` method (and its helper methods like `draw_border`, `draw_content`) modifies the passed-in `characterGrid` by placing characters or styled `Cell` objects at the appropriate coordinates using the `setChar()` utility function.
    *   After all widgets have drawn themselves onto the `characterGrid`, `drawTWidgets` calls `emitHTML(characterGrid)`.
    *   `emitHTML` converts the 2D `characterGrid` of `Cell` objects into a single HTML string (using `Cell.toString()` which handles HTML escaping or outputs pre-defined spans for styles) and updates the `innerHTML` of the `#characters-grid` div. The browser then renders this text/HTML.

## Widget Characteristics

Widgets are the building blocks of the desktop. They share common characteristics defined by base classes.

### `TWidget` (`js/widgets/TWidget.js`)

This is the base class for all widgets.

*   **Core Properties:** `x`, `y` (top-left position), `w`, `h` (width, height in characters), `title`, `hasFocus`.
*   **Core Methods:**
    *   `draw(charGrid, isTopWidget)`: Orchestrates the drawing of the widget. It calls helper methods to draw the shadow, borders, corners, title, close button, resizer, clear the content area, and finally calls `draw_content`.
    *   `draw_content(charGrid)`: **Abstract** (empty in base class). Subclasses *must* override this to draw their specific content.
    *   `gainFocus() / loseFocus()`: Called by the desktop system to manage the `hasFocus` state. Used for visual cues (e.g., shadow intensity, cursor blinking).
    *   `handleKeyPress(event)`: Called when the widget is active and a key is pressed. Subclasses override this to handle input. Returns `true` if handled.
    *   `scroll(delta)`: Called on mouse wheel events. Base implementation does nothing.
    *   `mouseDown(x, y)` / `click(x, y)`: Called on mouse events within the widget boundaries (after desktop checks for drag/resize etc.). Base implementation does nothing.
    *   `updateDimensions(w, h)`: Updates the widget's size.
    *   `destroy()`: Removes the widget from the global `tWidgets` list and clears the `activeWidget` reference if necessary.
*   **Standard Appearance:** Provides default methods to draw a frame (`draw_topBorder`, `draw_bottomBorder`, etc.), corners, title, a close button (`draw_close_button` using `Cell.closeButton`), a resize handle (`draw_resizerHandle` using `Cell.resizeHandle`), and a shadow (`draw_shadow`).

### `TScrollableWidget` (`js/widgets/TScrollableWidget.js`)

Inherits from `TWidget` and provides a base for widgets that need scrolling capabilities (like `TTextViewWidget` and `TEditorWidget`).

*   **Abstract Methods:** Requires subclasses to implement methods to define the scrollable content:
    *   `getContentDimensions()`: Calculates the available content area size (width/height) and determines if vertical/horizontal scrollbars are *currently* needed based on content size vs. available space and current scroll position.
    *   `getVerticalContentSize()` / `getHorizontalContentSize()`: Return the total size (e.g., lines or columns) of the content.
    *   `getVerticalScrollPosition()` / `getHorizontalScrollPosition()`: Return the current scroll offset.
    *   `setVerticalScrollPosition(pos)` / `setHorizontalScrollPosition(pos)`: Set the scroll offset, returning `true` if changed.
*   **Scrolling Logic:**
    *   `getVerticalScrollbarInfo()` / `getHorizontalScrollbarInfo()`: Calculate the necessary information to draw a scrollbar (track size, thumb size, thumb position) based on the results from the abstract methods. Returns `null` if no scrollbar is needed. Crucially, it forces scrollbar visibility if the content is scrolled, even if it would technically fit now.
    *   `drawScrollbars(charGrid, dims)`: Draws the vertical and horizontal scrollbars (track and thumb characters) onto the `charGrid` if needed, based on the info from `get...ScrollbarInfo`.
    *   `scroll(delta)`: Provides a default implementation for vertical scrolling using the mouse wheel, calling `setVerticalScrollPosition`. Returns `true` if scrolled.

## Event System

The event system translates low-level DOM events into actions within the desktop environment.

*   **Listeners:** Standard DOM event listeners (`mousedown`, `mousemove`, `mouseup`, `wheel`, `keydown`, `resize`) are attached to the `#characters-grid` or the `window` in `initializeSystem`.
*   **Coordinates:** Mouse event handlers use `getMouseCoords_chars(event)` to convert pixel coordinates relative to the grid element into character-based `(x, y)` coordinates.
*   **Widget Targeting:** Mouse handlers (`handleMouseDown`, `handleMouseMove`, `handleMouseUp`, `handleWheel`) use `findWidgetAt(mouseX_chars, mouseY_chars)` to identify which widget (if any) is under the mouse cursor. This function iterates the `tWidgets` array in reverse (top-most widget first).
*   **Focus:** Keyboard events (`handleKeyDown`) are dispatched only to the currently `activeWidget`. Mouse clicks typically set the `activeWidget` (`bringToFrontAndFocus`).
*   **State Management (`InteractionState.js`):** Mouse interactions like dragging, resizing, or selecting text are managed using a singleton `InteractionState` object (`interactionState`).
    *   `handleMouseDown` determines the intended interaction (click, drag, resize, scrollbar drag, start selection) based on the click location within the target widget and sets the `interactionState` (e.g., `interactionState.startDrag(...)`).
    *   `handleMouseMove` checks the `interactionState` and performs the corresponding action (e.g., updating widget position for drag, extending selection for editor) by calling helper functions (`handleWidgetDragMove`, `widget.extendSelection`, etc.).
    *   `handleMouseUp` checks the `interactionState` to finalize the action (e.g., calling `widget.click()` if it was a simple click) and resets the state using `interactionState.endInteraction()`.

### Example Event Flow: Mouse Click & Drag

1.  **User Action:** Presses the mouse button down over a widget's title bar.
2.  **DOM Event:** `mousedown` event fires.
3.  **Handler:** `handleMouseDown(event)` is called.
4.  **Coordinates:** `getMouseCoords_chars(event)` gets character coordinates (`mouseX_chars`, `mouseY_chars`).
5.  **Targeting:** `findWidgetAt()` identifies the `widget` under the cursor.
6.  **Focus:** If the `widget` is not `activeWidget`, `bringToFrontAndFocus(widget)` is called. This moves the widget to the end of `tWidgets`, sets `activeWidget`, calls `widget.gainFocus()` (and `oldWidget.loseFocus()`), potentially triggering a redraw if focus changes appearance.
7.  **Interaction Check:** `handleMouseDown` checks if the click is on the title bar (`tryHandleTitleBarDrag`).
8.  **State Update:** If it is, `startWidgetDrag(widget, mouseX_chars, mouseY_chars)` is called, which updates the `interactionState` to `{ type: 'drag', targetWidget: widget, startX, startY, offsetX, offsetY, isPressed: true }`. A status message ("Dragging...") is shown.
9.  **User Action:** Moves the mouse while holding the button.
10. **DOM Event:** `mousemove` event fires repeatedly.
11. **Handler:** `handleMouseMove(event)` is called.
12. **State Check:** It sees `interactionState.isDragging()` is true.
13. **Action:** Calls `handleWidgetDragMove(mouseX_chars, mouseY_chars)`.
14. **Widget Update:** `handleWidgetDragMove` calculates the new `widget.x`, `widget.y` based on mouse movement and the stored `offsetX`, `offsetY`, clamping values to stay within grid bounds.
15. **Redraw:** If the position changed, `handleWidgetDragMove` returns `true`, and `handleMouseMove` calls `drawTWidgets()` to update the screen.
16. **User Action:** Releases the mouse button.
17. **DOM Event:** `mouseup` event fires.
18. **Handler:** `handleMouseUp(event)` is called.
19. **State Check:** It sees `interactionState.isDragging()` was true.
20. **Finalization:** Calls `endActiveInteraction()`, which hides the status message and sets `interactionState.isPressed = false`.
21. **Redraw:** `handleMouseUp` calls `drawTWidgets()` to show the widget in its final dragged position.

### Example Event Flow: Keyboard Input (Editor)

1.  **User Action:** Clicks inside a `TEditorWidget` to give it focus, then presses the 'A' key.
2.  **Focus:** The `mousedown` handler calls `bringToFrontAndFocus()`, setting the editor as `activeWidget`.
3.  **User Action:** Presses the 'A' key.
4.  **DOM Event:** `keydown` event fires.
5.  **Handler:** `handleKeyDown(event)` is called.
6.  **Dispatch:** It checks `if (activeWidget)` which is true (the editor).
7.  **Widget Handling:** It calls `activeWidget.handleKeyPress(event)` (which is the editor's method).
8.  **Editor Logic (`TEditorWidget.handleKeyPress`):**
    *   Identifies the key ('A').
    *   Checks if it's a printable character and not modified by Ctrl/Meta/Alt.
    *   If a selection exists (`selection.active`), it calls `replaceSelection('A')`.
    *   If no selection, it calls `insertTextAtCursor('A')`.
    *   `insertTextAtCursor` uses `EditorBuffer.insert()` to add 'A' to the buffer at the `EditorCursor` position.
    *   It then updates the `EditorCursor` position (moves right).
    *   It increments `bufferVersion` and invalidates the `visualLayoutCache` if word wrap is on.
    *   It calls `ensureCursorVisible()` to adjust scroll if needed.
    *   It calls `drawTWidgets()` to update the display.
    *   It returns `true` because it handled the key.
9.  **Finalization:** `handleKeyDown` receives `true`, so it calls `event.preventDefault()` to stop the browser from also processing the 'A' key press.

## Interval Updates (Clock)

Widgets requiring periodic updates independent of user input use JavaScript's `setInterval`.

*   **Setup:** In `desktop.js`, the `createClock` function initiates the interval timer (`clockUpdateInterval = setInterval(updateClocks, CLOCK_UPDATE_INTERVAL_ms);`) but only if it's not already running. This means only one timer runs for all clocks.
*   **Callback (`updateClocks`):**
    *   This function is executed every `CLOCK_UPDATE_INTERVAL_ms` (1000ms).
    *   It iterates through all widgets in the `tWidgets` array.
    *   If a widget is an instance of `TClockWidget`, it calls `widget.update()`.
    *   The `TClockWidget.update()` method fetches the current time using `new Date()` and updates its internal `hours`, `minutes`, `seconds` properties.
    *   `updateClocks` keeps track if any clock widget actually updated (it assumes they always do for simplicity here, setting `needsRedraw = true`).
*   **Redraw:** If `needsRedraw` is true after checking all widgets, `updateClocks` calls `drawTWidgets()` to refresh the display, showing the updated clock hands.

## Rendering & Consistency

The system ensures a consistent representation of the desktop state by redrawing the entire view whenever a relevant change occurs.

*   **Character Grid:** The visual output is built upon a 2D array (`characterGrid`) where each element represents a character cell on the screen.
*   **`Cell` Object (`js/utils/Cell.js`):** Instead of just storing characters, the grid stores `Cell` objects. This allows associating styling information with each cell. `Cell` has static methods (`Cell.cursor()`, `Cell.selected()`, `Cell.closeButton()`, `Cell.resizeHandle()`) that create `Cell` instances containing pre-defined HTML `<span>` elements with specific CSS classes (`.cursor`, `.selected`, `.close-button`, etc.). The `Cell.toString()` method either returns the raw HTML (if `isHtml` is true) or an HTML-escaped plain character.
*   **Drawing Process (`drawTWidgets`):**
    1.  A new, empty `characterGrid` (filled with `Cell`s containing ' ') is created for each frame.
    2.  Widgets are iterated in the `tWidgets` array (determining draw order/Z-index).
    3.  Each widget's `draw()` method is called. Widgets use the `setChar(grid, x, y, content)` utility.
    4.  `setChar` performs boundary checks and places the provided `content` (either a string character, which it wraps in a new `Cell`, or an existing `Cell` object) into the `characterGrid` at the specified `[y][x]` index.
    5.  Widgets draw their frame, title, content, potentially using styled `Cell` objects for elements like the cursor, selection, or buttons.
*   **Output (`emitHTML`):** After all widgets have drawn onto the grid, `emitHTML` iterates through the `characterGrid`, calls `toString()` on each `Cell`, concatenates the results into a single large string (preserving line breaks for the `<pre>` nature of the container), and sets the `innerHTML` of the `#characters-grid` div.
*   **Consistency:** Because the entire grid is rebuilt from the state stored in the widgets (`tWidgets` array) on every relevant change (event, interval), the display is always consistent with the underlying application state.

### Immediate vs. Retained Mode

This system is an example of **Retained Mode**.

*   The application explicitly **retains** data structures representing the UI elements and their state (the `tWidgets` array and the properties within each widget object).
*   The `drawTWidgets` function acts as the rendering loop, traversing this retained data structure to draw the scene.
*   Event handlers modify the state within these retained structures and then trigger a full redraw.

(In contrast, an Immediate Mode GUI would typically involve drawing commands issued directly within the main loop or event handlers, rebuilding the UI description from scratch each frame without necessarily storing persistent widget objects in the same way.)

## Widget Details

### `TClockWidget` (`js/widgets/TClockWidget.js`)

*   **Purpose:** Displays an analog clock face using ASCII characters.
*   **Characteristics:** Not interactive beyond standard widget dragging/resizing/closing. Updates periodically.
*   **How it Works:**
    *   `update()`: Called by the global `updateClocks` interval. Gets the current time using `new Date()` and stores hours, minutes, seconds.
    *   `draw_content()`:
        *   Calculates the center (`centerX`, `centerY`) and radius based on widget dimensions (`w`, `h`) and the `Y_TO_X_CHARS_DIMENSIONS_RATIO` constant to account for non-square characters.
        *   Draws numbers (3, 6, 9, 12) if space permits, using `drawClockNumber` and `drawSymmetricalNumber` for better positioning relative to borders.
        *   Calculates the angles for hour, minute, and second hands based on the stored time.
        *   Calls `drawClockHand()` for each hand.
    *   `drawClockHand()`: Takes start (center), end (calculated from angle and length), and character. Uses the `drawLine()` utility (Bresenham's algorithm) to draw the hand onto the `charGrid`.

### `TTextViewWidget` (`js/widgets/TTextViewWidget.js`)

*   **Purpose:** Displays multi-line, scrollable, read-only text content.
*   **Characteristics:** Inherits from `TScrollableWidget`. Supports vertical scrolling. Automatically wraps text to fit its current width.
*   **How it Works:**
    *   **Text Wrapping:** Uses the `wrapText(text, maxWidth)` utility function. It caches the result of wrapping (`linesCache`) to avoid re-calculating on every draw. The cache is invalidated (`_updateLinesCache`) if the content or the widget width changes.
    *   **Scrolling:** Implements the abstract methods from `TScrollableWidget`:
        *   `getContentDimensions()`: Determines content width (widget width - borders - potential scrollbar) and height. Checks if `linesCache.length` exceeds content height to determine if vertical scrollbar is needed.
        *   `getVerticalContentSize()`: Returns `linesCache.length`.
        *   `get/setVerticalScrollPosition()`: Manages `this.scrollOffset` (index of the first visible line in `linesCache`).
    *   **Drawing (`draw_content`)**:
        *   Gets current content dimensions and the `linesCache`.
        *   Iterates from `0` to `contentHeight`.
        *   For each row, calculates the corresponding index in `linesCache` (`lineIndex = rowIndex + this.scrollOffset`).
        *   Draws the characters from `linesCache[lineIndex]` onto the `charGrid` row by row.
        *   Calls `this.drawScrollbars()` to render the vertical scrollbar if needed.

### `TStatusWidget` (`js/widgets/TStatusWidget.js`)

*   **Purpose:** Displays single-line status messages, typically docked at the bottom of the screen.
*   **Characteristics:** A specialized `TWidget`. Not closable by default. Has custom border drawing (no bottom border or shadow). Identified by `isStatusTWidget = true`.
*   **How it Works:**
    *   **Positioning:** Created and managed by `desktop.js`, which ensures it spans the grid width and stays at the bottom (`y = GRID_HEIGHT_chars - height`).
    *   `setMessage(message)`: Updates the internal `content` property. Used by `showStatusMessage` in `desktop.js` to display temporary or persistent messages. Returns `true` if the message changed.
    *   `draw_content()`: Takes the `content` string, uses `wrapText` (though typically only the first line is relevant), draws the first line within the widget boundaries, and adds "..." if the text is longer than the available width.
    *   `draw_*` overrides: Modifies the standard widget frame drawing (`draw_bottomBorder`, `draw_shadow`, `draw_close_button`, `draw_corners`) for its specific look.

### `TMenuWidget` (`js/widgets/TMenuWidget.js`)

*   **Purpose:** Provides a hierarchical menu system (like main menus or context menus).
*   **Characteristics:** Can be `pinned` (like the main menu, doesn't close on background click) or temporary (submenus). Manages a list of `menuItems` (which can have `label`, `callback`, or `subMenu`), the current `selectedIndex`, and references to its `parentMenu` and open `subMenu`.
*   **How it Works:**
    *   **Structure:** `menuItems` is an array of objects. If an item has a `subMenu` property (which is another array of menu items), selecting/activating it will create a new `TMenuWidget` instance for the submenu.
    *   **Drawing (`draw_content`)**: Iterates through `menuItems`. For each item, it draws the label, adds "> " prefix if selected (`selectedIndex`), and adds " ->" suffix if it has a `subMenu`. Ensures text fits within widget width.
    *   **Navigation (`handleKeyPress`, `selectNext`, `selectPrevious`, `selectIndex`, `click`)**: Arrow keys change `selectedIndex`. Enter/ArrowRight call `activate()`. ArrowLeft/Escape move to `parentMenu` or close the menu (if not pinned). `click` selects and activates an item. Changing selection often involves closing the current `subMenu` and potentially opening a new one (`_openSubMenuIfNeeded`).
    *   **Activation (`activate`)**: If the selected item has a `callback`, it's executed, and non-pinned menus up the hierarchy are closed. If it has a `subMenu`, that submenu is focused (`setActiveWidget`) or created and focused if it doesn't exist.
    *   **Closing (`closeSubMenu`, `closeAll`)**: Handles recursively closing submenus and removing the menu widget instance(s) from the global `tWidgets` list using `destroy()`.

### `TEditorWidget` (`js/widgets/editor/TEditorWidget.js`)

*   **Purpose:** Provides a scrollable, multi-line text editing area.
*   **Characteristics:** The most complex widget. Inherits `TScrollableWidget`. Supports text manipulation, cursor movement, selection, clipboard operations (cut/copy/paste), optional word wrap, and cursor blinking.
*   **Key Internal Components:**
    *   `EditorBuffer`: Stores the text content as an array of strings (`lines`). Provides methods like `insert`, `delete`, `split`, `getLine`.
    *   `EditorCursor`: Stores the logical cursor position (`row`, `col`) and a `col_hint` (used to maintain horizontal position when moving vertically across lines of different lengths). Provides methods like `up`, `down`, `left`, `right`.
    *   `EditorSelection`: Manages the selection state (`active`, `startRow/Col`, `endRow/Col`). Provides methods like `start`, `extend`, `clear`, `contains`, `getSelectedText`.
    *   `EditorWindow` (Legacy/Non-Wrapped): Manages the *logical* viewport scroll offsets (`row`, `col`) and dimensions (`n_rows`, `n_cols`) when word wrap is *off*. `translate()` converts logical buffer coordinates to window-relative coordinates.
    *   `wordWrapEnabled`: Boolean flag to toggle word wrap.
    *   `visualLayoutCache`: When wrapping is on, caches the calculated visual layout (mapping logical lines/cols to visual lines/segments) to optimize rendering and coordinate mapping. Contains `{ lines: Array<{text, logicalRow, startCol, endCol}>, totalVisualLines, contentWidth, bufferVersion }`.
    *   `visualScrollTop`: Stores the index of the top-most *visual* line shown in the viewport when word wrap is on.
    *   `bufferVersion`: Counter incremented on buffer modification, used to invalidate `visualLayoutCache`.
*   **How it Works (Key Flows):**
    *   **Word Wrap:**
        *   Toggled by `toggleWordWrap()` (Alt+W).
        *   When `wordWrapEnabled` is true:
            *   `getContentDimensions`, `getVerticalContentSize`, `get/setVerticalScrollPosition` operate based on *visual* lines. Horizontal scrolling is disabled.
            *   `getVisualLayout(width)` calculates (or returns cached) mapping from logical buffer lines to visual lines based on wrapping at the given `width`.
            *   `mapLogicalToVisual` and `mapVisualToLogical` are used extensively for drawing and event handling to translate between coordinate systems.
            *   Drawing (`draw_content`) iterates through the visible portion of the `visualLayoutCache`.
            *   Navigation (`handleKeyPress`) uses visual line/column calculations for up/down/left/right movements.
        *   When `wordWrapEnabled` is false: Uses the original logic based on `EditorWindow`'s logical scroll offsets (`editorWindow.row`, `editorWindow.col`) and `EditorBuffer` directly.
    *   **Keyboard Input (`handleKeyPress`):**
        1.  Determines action based on `key`, `shiftKey`, `ctrlKey`/`metaKey`.
        2.  Handles modifiers, clipboard shortcuts, navigation, and editing characters (Enter, Backspace, Delete, printable chars).
        3.  **If Wrapped:** Uses visual mapping for navigation logic (e.g., ArrowUp moves to the visual line above, trying to maintain `col_hint`). Editing actions modify the `EditorBuffer` at the logical cursor position.
        4.  **If Not Wrapped:** Uses `EditorCursor` methods (`up`, `down`, etc.) and `EditorWindow` methods (`up`, `down`, `horizontal_scroll`) directly on logical coordinates. Editing actions modify `EditorBuffer`.
        5.  Updates `EditorCursor` position.
        6.  Updates `EditorSelection` if Shift is pressed or if an edit affects the selection (e.g., typing replaces selection).
        7.  Increments `bufferVersion`, invalidates `visualLayoutCache` if wrapped and buffer changed.
        8.  Calls `ensureCursorVisible()` to scroll if needed.
        9.  Calls `drawTWidgets()`.
        10. Handles special boundary cursor movement (e.g. pressing 'up' on the first visual line).
    *   **Mouse Input (`mouseDown`, `extendSelection`, `click`):**
        1.  `mouseDown`: Maps the clicked character-grid coordinates to logical buffer coordinates (using `mapVisualToLogical` if wrapped, or `editorWindow` offsets if not). Sets `EditorCursor` position. Calls `selection.start()` to begin selection tracking. `InteractionState` is set to 'click' or 'selecting'.
        2.  `extendSelection` (called by `handleMouseMove` when `interactionState` is 'selecting'): Calculates target logical coordinates based on mouse position, handles auto-scrolling if mouse is near widget edges, updates `EditorCursor` position, calls `selection.extend()`. Returns `true` if redraw needed (scroll or selection changed).
        3.  `click` (called by `handleMouseUp` if no drag occurred): Clears the selection if `start === end` (i.e., it was just a cursor placement click).
    *   **Drawing (`draw_content`):** Iterates through the visible rows (visual or logical based on wrap state). For each character cell, determines the corresponding logical buffer coordinates. Checks if the cell is the cursor position and/or within the `selection.active` range. Uses `Cell.cursor()`, `Cell.selected()`, or plain characters via `setChar` accordingly. Calls `drawScrollbars`.
    *   **Cursor Blinking:** Uses `setTimeout` in `resetCursorBlinkTimer` to toggle `isCursorBlinking` flag and trigger redraws, creating the blink effect when the widget `hasFocus`.

## Other Relevant Topics for Interactive Systems

Beyond the specifics implemented here, general topics relevant to interactive/desktop systems include:

*   **Focus Management:** How input focus is transferred between components (handled here via `activeWidget`). More complex systems might have focus traversal orders (Tab key).
*   **Window Management:** More advanced features like minimizing, maximizing, tiling, virtual desktops, taskbars.
*   **Layout Management:** Systems for automatically arranging widgets within containers (e.g., grids, boxes), adapting to resizing. This system uses fixed positioning and manual resizing.
*   **State Management:** Strategies for managing application state, especially in larger applications (e.g., Redux, MobX, or simpler patterns). Here, state is mostly in `desktop.js` globals and widget instances.
*   **Performance Optimization:** Techniques to avoid redrawing the entire screen on every small change, such as:
    *   **Dirty Rectangles:** Only redrawing areas of the screen that have changed.
    *   **Virtual DOM Diffing:** (Common in web frameworks) Comparing a virtual representation of the UI to the previous one and only applying necessary changes to the actual DOM.
*   **Accessibility (a11y):** Making the system usable for people with disabilities (e.g., screen reader support, keyboard navigation). ASCII interfaces present unique challenges here.
*   **Theming/Styling:** Allowing users to customize the appearance (colors, characters used for borders). Handled via CSS here.
*   **Persistence:** Saving the state of the desktop (widget positions, content) and restoring it later.
*   **Inter-Widget Communication:** Mechanisms for widgets to interact with each other (e.g., drag-and-drop text between editors, signals/events).
*   **Asynchronous Operations:** Handling operations that take time without blocking the UI thread (e.g., loading large files into an editor).

## Conclusion

This ASCII Desktop system provides a functional, albeit simple, simulation of a graphical environment using text characters. It demonstrates key concepts like retained mode rendering, event handling, widget abstraction, scrolling, and basic window management within a constrained, character-grid environment. The `TEditorWidget` showcases more complex state management involving coordinate mapping for features like word wrap.