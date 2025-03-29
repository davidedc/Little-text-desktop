// TMenuWidget: Implements a menu system with submenus
class TMenuWidget extends TWidget {
    constructor(posX, posY, width, height, title, menuItems, pinned = true, parentMenu = null) {
        // Calculate required height based on items, ensure minimum height respects constructor arg
        const requiredHeight = menuItems.length + 2; // +2 for top/bottom borders
        const adjustedHeight = Math.max(height, requiredHeight);
        super(posX, posY, width, adjustedHeight, title);
        this.menuItems = menuItems || []; // Ensure menuItems is an array
        this.selectedIndex = -1; // No item selected initially
        this.subMenu = null; // Reference to the currently open submenu instance
        this.pinned = pinned; // If true, doesn't close automatically on background click/escape root
        this.parentMenu = parentMenu; // Reference to the parent menu, if this is a submenu
        this.isOpen = true; // Flag to track if the menu is considered open (mainly for submenus)
    }

    /** Closes the currently open submenu (if any) */
    closeSubMenu() {
        if (this.subMenu) {
            this.subMenu.closeAll(); // Recursively close sub-submenus
            // destroy() will remove from tWidgets and handle viewMenuWidget cleanup if needed
            // No need to call destroy() here, closeAll does it.
            this.subMenu = null; // Clear the reference
        }
    }

    /** Closes this menu and any open submenus, then destroys the widget */
    closeAll() {
        this.closeSubMenu(); // Close any child menus first
        this.isOpen = false;
        this.destroy(); // Removes from tWidgets, clears activeWidget if needed, cleans up viewMenuWidget ref
    }

    /** Selects the next menu item, wrapping around */
    selectNext() {
        if (!this.menuItems.length) return; // No items to select
        this.closeSubMenu(); // Close existing submenu before changing selection
        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this._openSubMenuIfNeeded(); // Open submenu for the newly selected item if it has one
    }

    /** Selects the previous menu item, wrapping around */
    selectPrevious() {
        if (!this.menuItems.length) return; // No items to select
        this.closeSubMenu(); // Close existing submenu
        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this._openSubMenuIfNeeded(); // Open submenu if needed
    }

    /**
     * Selects a specific item by index. Closes existing submenu.
     * @param {number} index The index of the item to select.
     * @returns {boolean} True if the index was valid and selection changed, false otherwise.
     */
    selectIndex(index) {
        if (index >= 0 && index < this.menuItems.length && index !== this.selectedIndex) {
            this.closeSubMenu(); // Close existing submenu
            this.selectedIndex = index;
            this._openSubMenuIfNeeded(); // Open new submenu if applicable
            return true;
        }
        return false;
    }

    /** Internal helper: Creates and shows a submenu if the selected item has one */
    _openSubMenuIfNeeded() {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.menuItems.length) return; // Invalid index

        const item = this.menuItems[this.selectedIndex];
        if (item.subMenu && item.subMenu.length > 0) { // Check if subMenu exists and is not empty
            // Calculate position relative to parent item
            const subMenuX = this.x + this.w - 1; // Position to the right, slightly overlapping
            const subMenuY = this.y + 1 + this.selectedIndex; // Align with the selected item row
            const subMenuWidth = this.w; // Default to same width as parent
            const subMenuHeight = item.subMenu.length + 2; // Calculate required height

            // Ensure submenu fits on screen, adjusting position if necessary
             const clampedX = clamp(subMenuX, 0, GRID_WIDTH_chars - subMenuWidth);
             // Try positioning to the left if it doesn't fit on the right
             let finalX = clampedX;
             if (subMenuX + subMenuWidth > GRID_WIDTH_chars) {
                  const leftX = this.x - subMenuWidth + 1;
                   finalX = clamp(leftX, 0, GRID_WIDTH_chars - subMenuWidth);
             }

              const clampedY = clamp(subMenuY, 0, GRID_HEIGHT_chars - subMenuHeight - STATUS_WINDOW_HEIGHT_chars);


            // Create the submenu instance
            this.subMenu = new TMenuWidget(
                finalX,
                clampedY,
                subMenuWidth,
                subMenuHeight,
                item.label, // Title of submenu is the label of the parent item
                item.subMenu,
                false, // Submenus are never pinned
                this // Set parent reference
            );
            tWidgets.push(this.subMenu); // Add to global widget list
            bringToFront(this.subMenu); // Draw on top, but don't focus yet
        }
    }

    /** Activates the currently selected menu item (executes callback or opens/focuses submenu) */
    activate() {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.menuItems.length) {
            return; // No item selected or invalid index
        }

        const item = this.menuItems[this.selectedIndex];

        if (item.subMenu) {
            // Item has a submenu
            // Ensure the submenu instance exists (it should have been created by _openSubMenuIfNeeded)
            const subMenuIsValid = this.subMenu && tWidgets.includes(this.subMenu);

            if (subMenuIsValid) {
                // Submenu exists, make it active and select its first item
                setActiveWidget(this.subMenu);
                if (this.subMenu.menuItems.length > 0) {
                    this.subMenu.selectedIndex = 0; // Select first item automatically
                    this.subMenu._openSubMenuIfNeeded(); // Open sub-submenu if the first item has one
                } else {
                    this.subMenu.selectedIndex = -1; // No items in submenu
                }
            } else {
                 // Submenu doesn't exist or was closed, try reopening it
                 this.closeSubMenu(); // Clean up just in case
                 this._openSubMenuIfNeeded(); // Create the submenu
                 if (this.subMenu) { // If creation was successful
                      setActiveWidget(this.subMenu); // Focus it
                     if (this.subMenu.menuItems.length > 0) {
                          this.subMenu.selectedIndex = 0;
                          this.subMenu._openSubMenuIfNeeded();
                     } else {
                          this.subMenu.selectedIndex = -1;
                     }
                 }
            }
        } else if (item.callback) {
            // Item has a callback function
            item.callback(); // Execute the action
            // Close non-pinned menus up the hierarchy after executing callback
            let current = this;
            while (current && !current.pinned) {
                const parent = current.parentMenu;
                current.closeAll(); // closeAll destroys the widget
                current = parent;
            }
            // If the loop finished on a pinned menu, ensure it's active
            if (current && current.pinned) {
                setActiveWidget(current);
                 // Optionally, deselect the item in the pinned menu after action?
                 // current.selectedIndex = -1;
                 // current.closeSubMenu(); // Close any submenus that might have been open
            } else if (!current) {
                 // All menus were closed
                 setActiveWidget(null);
            }
        }
         // No else needed: If item has neither submenu nor callback, activating does nothing.

        // Redraw after activation (focus change, menu closing)
        drawTWidgets();
    }

    /** Handles mouse clicks within the menu widget */
    click(posX, posY) {
        super.click(posX, posY); // Call base class click (currently does nothing)

        // Calculate which item was clicked based on relative Y coordinate
        // Relative Y = screenY - widgetY. Item index = relativeY - 1 (for top border)
        const clickedItemIndex = posY - this.y - 1;

        // Check if the click was on a valid item row
        if (clickedItemIndex >= 0 && clickedItemIndex < this.menuItems.length) {
            // Check if click was within horizontal bounds (inside borders)
             const innerX = posX - this.x;
             if (innerX > 0 && innerX < this.w -1) {
                const selectionChanged = this.selectIndex(clickedItemIndex); // Select the clicked item
                this.activate(); // Activate the selected item
                 // Redraw happens in activate if needed
             }
        } else {
            // Click was on border or outside item area, potentially close non-pinned menus?
            // Background click handler in desktop.js usually handles this.
        }
    }

    /** Menus typically don't respond to scrolling */
    scroll(scrollDelta) {
         // No action needed for menus on scroll
         return false; // Indicate scroll was not handled
    }

    /** Draw the menu frame and items */
    draw(charGrid, isTopWidget = false) {
        super.draw(charGrid, isTopWidget); // Draw standard widget frame (borders, title, shadow, etc.)

        // Draw menu items within the frame
        for (let itemIndex = 0; itemIndex < this.menuItems.length; itemIndex++) {
            const menuItem = this.menuItems[itemIndex];
            const isSelected = itemIndex === this.selectedIndex;
            const screenY = this.y + 1 + itemIndex; // Y position on the screen grid

            // Stop drawing items if they exceed widget height (minus borders)
            if (screenY >= this.y + this.h - 1) break;

            // --- Prepare item text ---
            let prefix = isSelected ? "> " : "  "; // Selection indicator
            let suffix = menuItem.subMenu ? " ->" : "   "; // Submenu indicator

            // Calculate available width for the label itself
            const maxLabelWidth = Math.max(0, this.w - 2 - prefix.length - suffix.length);
            // Truncate label if needed
            let labelText = menuItem.label || ""; // Handle undefined label
            if (labelText.length > maxLabelWidth) {
                labelText = labelText.substring(0, maxLabelWidth);
            }
            // Construct full item string
            const menuItemText = prefix + labelText; // Start with prefix and label
            const fullText = menuItemText + " ".repeat(Math.max(0, this.w - 2 - menuItemText.length - suffix.length)) + suffix;


            // --- Draw the item text ---
            for (let charIndex = 0; charIndex < this.w - 2; charIndex++) {
                const screenX = this.x + 1 + charIndex;
                const charToDraw = charIndex < fullText.length ? fullText[charIndex] : ' '; // Get char or space

                // Use Cell.selected if the item is selected for inverted colors (optional styling choice)
                if (isSelected && activeWidget === this) { // Highlight only if menu is active
                     // Use default character rendering for selected item text, prefix/suffix indicate selection
                     setChar(charGrid, screenX, screenY, charToDraw);
                     // OR: Use inverted style for selection (uncomment below)
                     // setChar(charGrid, screenX, screenY, Cell.selected(charToDraw));
                } else {
                     setChar(charGrid, screenX, screenY, charToDraw);
                }
            }
        }
    }

    /** Override: Don't draw close button on pinned menus */
    draw_close_button(charGrid) {
        if (!this.pinned) {
            super.draw_close_button(charGrid);
        }
    }

     /** Override: Don't draw resize handle on menus */
     draw_resizerHandle(charGrid) {
         // Menus are typically not resizable
         // To make resizable, remove this override and handle resizing effects
          // Draw the corner instead
          setChar(charGrid, this.x + this.w - 1, this.y + this.h - 1, '┘');
     }


    /** Handle keyboard input for menu navigation */
    handleKeyPress(event) {
        let handled = true; // Assume handled unless default case
        const key = event.key;

        switch (key) {
            case "ArrowUp":
                this.selectPrevious();
                break;
            case "ArrowDown":
                this.selectNext();
                break;
            case "ArrowRight":
            case "Enter":
                 // Check if selected item has submenu before activating
                 if(this.selectedIndex > -1 && this.menuItems[this.selectedIndex]?.subMenu) {
                     this.activate(); // Activate opens submenu and focuses it
                 } else if (this.selectedIndex > -1) {
                      this.activate(); // Activate executes callback and closes menus
                 } else {
                      handled = false; // No item selected, do nothing
                 }
                break;
            case "ArrowLeft":
                if (this.parentMenu) {
                     // Close this submenu and focus parent
                     this.closeAll(); // Destroys this menu
                     setActiveWidget(this.parentMenu);
                     // Optional: Deselect item in parent?
                     // this.parentMenu.selectedIndex = -1;
                     // this.parentMenu.closeSubMenu();
                } else {
                    // Left arrow on root menu does nothing
                    handled = false;
                }
                break;
            case "Escape":
                if (this.pinned && !this.parentMenu) {
                    // Escape on pinned root menu: deselect item and close any open submenu
                    this.closeSubMenu();
                    this.selectedIndex = -1;
                } else {
                    // Escape on non-pinned menu or submenu: close up to pinned parent or close all
                    let menu = this;
                    while (menu && !menu.pinned) {
                        const parent = menu.parentMenu;
                        menu.closeAll(); // Destroys the current menu
                        menu = parent; // Move up the hierarchy
                    }
                    // If loop ended on a pinned menu, focus it and deselect
                    if (menu) {
                        setActiveWidget(menu);
                        menu.selectedIndex = -1;
                        menu.closeSubMenu();
                    } else {
                         // All menus were closed, no active widget
                         setActiveWidget(null);
                    }
                }
                break;
            default:
                handled = false; // Key not handled by menu navigation
        }

        if (handled) {
            event.preventDefault(); // Prevent default browser action for handled keys
            drawTWidgets(); // Redraw the screen after menu state change
        }
        return handled; // Return true if key was processed
    }

    /** Clean up resources when widget is destroyed */
    destroy() {
        // Find and remove this widget from the global tWidgets array
        const i = tWidgets.indexOf(this);
        if (i > -1) {
            tWidgets.splice(i, 1);
        }

        // Clear active widget reference if it was this widget
        if (activeWidget === this) {
            activeWidget = null;
        }

        // If this instance was the tracked View menu, clear the global reference
        // Ensure viewMenuWidget exists in the scope (defined in desktop.js)
        if (typeof viewMenuWidget !== 'undefined' && this === viewMenuWidget) {
            viewMenuWidget = null;
        }
    }
}