// TStatusWidget: Displays status messages at the bottom of the screen
class TStatusWidget extends TWidget {
    constructor(posX, posY, width, height) {
        super(posX, posY, width, height, "Status");
        this.content = "";
        this.isStatusTWidget = true;
    }

    // Override border drawing methods to customize appearance
    draw_bottomBorder(charGrid) { }
    draw_shadow(charGrid, isTopWidget) { }
    draw_close_button(charGrid) { }
    
    // Keep resize handle for resizability
    
    draw_corners(charGrid) {
        setChar(charGrid, this.x, this.y, '┌');
        setChar(charGrid, this.x + this.w - 1, this.y, '┐');
    }

    draw_content(charGrid) {
        const innerWidth = this.w - 2;
        const innerHeight = this.h - 2;

        if (innerWidth <= 0 || innerHeight <= 0) return;

        const textLines = wrapText(this.content, innerWidth);
        const firstLine = textLines[0] || "";
        const contentY = this.y + 1;

        // Draw first line
        for (let charIndex = 0; charIndex < innerWidth; charIndex++) {
            const posX = this.x + 1 + charIndex;
            const character = charIndex < firstLine.length ? firstLine[charIndex] : ' ';
            setChar(charGrid, posX, contentY, character);
        }

        // Show ellipsis if content is truncated
        if (textLines.length > 1 || firstLine.length > innerWidth) {
            const endX = this.x + innerWidth;
            if (endX > this.x + 3) {
                setChar(charGrid, endX - 2, contentY, '.');
                setChar(charGrid, endX - 1, contentY, '.');
                setChar(charGrid, endX, contentY, '.');
            }
        }
    }

    setMessage(message) {
        if (this.content !== message) {
            this.content = message;
            return true;
        }
        return false;
    }
}