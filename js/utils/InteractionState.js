/**
 * InteractionState - Singleton class to encapsulate all interaction state
 * 
 * Manages the current interaction state (dragging, resizing, scrolling) and related data
 * to avoid using multiple global variables for tracking user interactions.
 */
class InteractionState {
    constructor() {
        // Initialize with default "no interaction" state
        this.reset();
    }

    /**
     * Reset the interaction state to its default values
     */
    reset() {
        this.type = 'none';       // Type of interaction: 'none', 'drag', 'resize', 'scroll', 'click'
        this.targetWidget = null; // Widget being interacted with
        this.startX = 0;          // Starting X coordinate (in character units)
        this.startY = 0;          // Starting Y coordinate (in character units)
        this.offsetX = 0;         // Drag offset X (for dragging)
        this.offsetY = 0;         // Drag offset Y (for dragging)
        this.startOffset = 0;     // Starting scroll offset (for scrolling)
        this.axis = null;         // Scroll axis: 'vertical' or 'horizontal'
        this.isPressed = false;   // Whether mouse is currently pressed
    }
    
    /**
     * Start a simple click interaction
     * @param {TWidget} widget - The widget being clicked
     * @param {number} x - Mouse X coordinate in character units
     * @param {number} y - Mouse Y coordinate in character units
     */
    startClick(widget, x, y) {
        this.type = 'click';
        this.targetWidget = widget;
        this.startX = x;
        this.startY = y;
        this.isPressed = true;
    }

    /**
     * Start a dragging interaction
     * @param {TWidget} widget - The widget being dragged
     * @param {number} x - Mouse X coordinate in character units
     * @param {number} y - Mouse Y coordinate in character units
     * @param {number} offsetX - X offset from widget origin
     * @param {number} offsetY - Y offset from widget origin
     */
    startDrag(widget, x, y, offsetX, offsetY) {
        this.type = 'drag';
        this.targetWidget = widget;
        this.startX = x;
        this.startY = y;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.isPressed = true;
    }

    /**
     * Start a resizing interaction
     * @param {TWidget} widget - The widget being resized
     * @param {number} x - Mouse X coordinate in character units
     * @param {number} y - Mouse Y coordinate in character units
     */
    startResize(widget, x, y) {
        this.type = 'resize';
        this.targetWidget = widget;
        this.startX = x;
        this.startY = y;
        this.isPressed = true;
    }

    /**
     * Start a scrollbar dragging interaction
     * @param {TWidget} widget - The widget with the scrollbar being dragged
     * @param {string} axis - The scroll axis: 'vertical' or 'horizontal'
     * @param {number} x - Mouse X coordinate in character units
     * @param {number} y - Mouse Y coordinate in character units
     * @param {number} startOffset - The initial scroll offset
     */
    startScrollDrag(widget, axis, x, y, startOffset) {
        this.type = 'scroll';
        this.targetWidget = widget;
        this.axis = axis;
        this.startX = x;
        this.startY = y;
        this.startOffset = startOffset;
        this.isPressed = true;
    }

    /**
     * Check if there is an active interaction
     * @returns {boolean} True if an interaction is in progress
     */
    isActive() {
        return this.isPressed && (this.type !== 'none' && this.type !== 'click');
    }
    
    /**
     * Check if a click interaction is in progress
     * @returns {boolean} True if currently clicking
     */
    isClicking() {
        console.log("Checking click state:", this.isPressed, this.type, 
                   (this.isPressed && this.type === 'click'));
        return this.isPressed && this.type === 'click';
    }

    /**
     * Check if a drag interaction is in progress
     * @returns {boolean} True if currently dragging
     */
    isDragging() {
        return this.isPressed && this.type === 'drag';
    }

    /**
     * Check if a resize interaction is in progress
     * @returns {boolean} True if currently resizing
     */
    isResizing() {
        return this.isPressed && this.type === 'resize';
    }

    /**
     * Check if a scrollbar drag interaction is in progress
     * @returns {boolean} True if currently dragging a scrollbar
     */
    isScrolling() {
        return this.isPressed && this.type === 'scroll';
    }

    /**
     * End the current interaction
     */
    endInteraction() {
        this.isPressed = false;
    }
}

// Create and export singleton instance
const interactionState = new InteractionState();