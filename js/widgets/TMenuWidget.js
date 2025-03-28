// TMenuWidget: Implements a menu system with submenus
class TMenuWidget extends TWidget {
    constructor(posX, posY, width, height, title, menuItems, pinned = true, parentMenu = null) {
        const requiredHeight = menuItems.length + 2;
        const adjustedHeight = Math.max(height, requiredHeight);
        super(posX, posY, width, adjustedHeight, title);
        this.menuItems = menuItems;
        this.selectedIndex = -1;
        this.subMenu = null;
        this.pinned = pinned;
        this.parentMenu = parentMenu;
        this.isOpen = true;
    }

    closeSubMenu() {
        if (this.subMenu) {
            this.subMenu.closeAll();
            this.subMenu.destroy();
            this.subMenu = null;
        }
    }

    closeAll() {
        this.closeSubMenu();
        this.isOpen = false;
        this.destroy();
    }

    selectNext() {
        if (!this.menuItems.length) return;
        this.closeSubMenu();
        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this._openSubMenuIfNeeded();
    }

    selectPrevious() {
        if (!this.menuItems.length) return;
        this.closeSubMenu();
        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this._openSubMenuIfNeeded();
    }

    selectIndex(index) {
        if (index >= 0 && index < this.menuItems.length && index !== this.selectedIndex) {
            this.closeSubMenu();
            this.selectedIndex = index;
            this._openSubMenuIfNeeded();
            return true;
        }
        return false;
    }

    _openSubMenuIfNeeded() {
        if (this.selectedIndex === -1) return;

        const item = this.menuItems[this.selectedIndex];
        if (item.subMenu) {
            const subMenuX = this.x + this.w - 1;
            const subMenuY = this.y + 1 + this.selectedIndex;
            const subMenuWidth = this.w;
            const subMenuHeight = item.subMenu.length + 2;

            this.subMenu = new TMenuWidget(
                subMenuX,
                subMenuY,
                subMenuWidth,
                subMenuHeight,
                item.label,
                item.subMenu,
                false,
                this
            );
            tWidgets.push(this.subMenu);
            bringToFront(this.subMenu);
        }
    }

    activate() {
        if (this.selectedIndex === -1 || !this.menuItems.length) {
            return;
        }

        const item = this.menuItems[this.selectedIndex];
        if (item.subMenu) {
            const subMenuIsValid = this.subMenu && tWidgets.includes(this.subMenu);
            if (subMenuIsValid) {
                setActiveWidget(this.subMenu);
                if (this.subMenu.menuItems.length > 0) {
                    this.subMenu.selectedIndex = 0;
                }
            } else {
                this.closeSubMenu();
                this._openSubMenuIfNeeded();
                if (this.subMenu) {
                    setActiveWidget(this.subMenu);
                    if (this.subMenu.menuItems.length > 0) {
                        this.subMenu.selectedIndex = 0;
                    }
                }
            }
        } else if (item.callback) {
            item.callback();
            let current = this;
            while (current && !current.pinned) {
                const parent = current.parentMenu;
                current.closeAll();
                current = parent;
            }
            if (!current) {
                activeWidget = null;
            } else {
                setActiveWidget(current);
            }
        }
    }

    click(posX, posY) {
        super.click(posX, posY);
        const clickedItemIndex = posY - this.y - 1;
        if (clickedItemIndex >= 0 && clickedItemIndex < this.menuItems.length) {
            this.selectIndex(clickedItemIndex);
            this.activate();
        }
    }

    scroll(scrollDelta) { }

    draw(charGrid, isTopWidget = false) {
        super.draw(charGrid, isTopWidget);

        for (let itemIndex = 0; itemIndex < this.menuItems.length; itemIndex++) {
            const menuItem = this.menuItems[itemIndex];
            const isSelected = itemIndex === this.selectedIndex;
            let prefix = isSelected ? "> " : "  ";
            let suffix = menuItem.subMenu ? " ->" : "   ";

            const maxLabelWidth = this.w - 2 - prefix.length - suffix.length;
            const truncatedLabel = menuItem.label.substring(0, maxLabelWidth);
            const menuItemText = prefix + truncatedLabel + suffix;
            const rowPosition = this.y + 1 + itemIndex;

            // Draw menu item
            for (let charIndex = 0; charIndex < menuItemText.length; charIndex++) {
                const colPosition = this.x + 1 + charIndex;
                setChar(charGrid, colPosition, rowPosition, menuItemText[charIndex]);
            }

            // Fill remaining space with spaces
            for (let spaceIndex = menuItemText.length; spaceIndex < this.w - 2; spaceIndex++) {
                const colPosition = this.x + 1 + spaceIndex;
                setChar(charGrid, colPosition, rowPosition, ' ');
            }
        }
    }

    draw_close_button(charGrid) {
        if (!this.pinned) {
            super.draw_close_button(charGrid);
        }
    }

    handleKeyPress(event) {
        let handled = true;
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
                this.activate();
                break;
            case "ArrowLeft":
                if (this.parentMenu) {
                    this.closeAll();
                    setActiveWidget(this.parentMenu);
                } else {
                    handled = false;
                }
                break;
            case "Escape":
                let menu = this;
                if (menu.pinned && !menu.parentMenu) {
                    this.closeSubMenu();
                    this.selectedIndex = -1;
                } else {
                    while (menu && !menu.pinned) {
                        const parent = menu.parentMenu;
                        menu.closeAll();
                        menu = parent;
                    }
                    if (menu) {
                        setActiveWidget(menu);
                        menu.selectedIndex = -1;
                        menu.closeSubMenu();
                    } else {
                        activeWidget = null;
                    }
                }
                break;
            default:
                handled = false;
        }

        if (handled) {
            event.preventDefault();
            drawTWidgets();
        }
        return handled;
    }
}