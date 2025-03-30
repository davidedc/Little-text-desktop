// TClockWidget: Displays an analog clock using ASCII characters
class TClockWidget extends TWidget {
    constructor(posX, posY, width, height) {
        super(posX, posY, width, height, "Clock");
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
    }

    update() {
        const now = new Date();
        this.hours = now.getHours();
        this.minutes = now.getMinutes();
        this.seconds = now.getSeconds();
    }

    draw_content(charGrid) {
        // Calculate center point and radius
        const centerX = this.x + Math.floor((this.w - 1) / 2);
        const centerY = this.y + Math.floor((this.h - 1) / 2);
        const clockRadius = Math.min(
            Math.floor((this.w - 2) / 2 / Y_TO_X_CHARS_DIMENSIONS_RATIO),
            Math.floor((this.h - 2) / 2)
        );

        if (clockRadius < 1) return;

        // Draw clock numbers if enough space
        if (this.w >= 10 && this.h >= 5) {
            // Calculate the distance from right edge to '3' and bottom edge to '6'
            // to achieve symmetrical positioning
            
            // First, draw 3 and 6 (which appear correct)
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 3);
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 6);
            
            // For 12 and 9, calculate their positions based on 6 and 3's distances from borders
            // This is because if we position 12 and 9 based on the center and radius, they might
            // end up having different distances to the borders, making the clock look symmetrical (this
            // is becaus the center itself might not be at the center of the widget in case the
            // width/height is even).
            // SO, we make sure that 3 and 6 have a reasonable position, and then we put 12 and 9
            // with the same distances from the borders as 3 and 6 have, so they are symmetrical.
            this.drawSymmetricalNumber(charGrid, centerX, centerY, clockRadius, 12, 6, this); // 12 symmetrical to 6
            this.drawSymmetricalNumber(charGrid, centerX, centerY, clockRadius, 9, 3, this);  // 9 symmetrical to 3
        }

        // Calculate hand angles
        const secondAngle = this.seconds * 6;
        const minuteAngle = this.minutes * 6 + this.seconds / 10;
        const hourAngle = (this.hours % 12) * 30 + this.minutes / 2;

        // Draw clock hands
        this.drawClockHand(charGrid, centerX, centerY, secondAngle, clockRadius * 0.75, '.');
        this.drawClockHand(charGrid, centerX, centerY, minuteAngle, clockRadius * 0.55, 'M');
        this.drawClockHand(charGrid, centerX, centerY, hourAngle, clockRadius * 0.4, 'H');
        setChar(charGrid, centerX, centerY, 'o');
    }

    drawClockNumber(charGrid, centerX, centerY, radius, number) {
        const angleRadians = (number * 30 - 90) * Math.PI / 180;
        let posX = Math.round(centerX + radius * Math.cos(angleRadians) * Y_TO_X_CHARS_DIMENSIONS_RATIO);
        let posY = Math.round(centerY + radius * Math.sin(angleRadians));
        const numberText = number.toString();

        if (numberText.length === 1) {
            setChar(charGrid, posX, posY, numberText);
        } else {
            setChar(charGrid, posX - 1, posY, numberText[0]);
            setChar(charGrid, posX, posY, numberText[1]);
        }
        
        // For symmetrical number placement, return the calculated position
        return { posX, posY };
    }
    
    /**
     * Draws a number at a position that's symmetrical to another number relative to the clock center
     * @param {Array} charGrid - The character grid to draw on
     * @param {number} centerX - Clock center X coordinate
     * @param {number} centerY - Clock center Y coordinate
     * @param {number} radius - Clock radius
     * @param {number} number - The number to draw
     * @param {number} referenceNumber - The reference number to be symmetrical with
     * @param {object} widget - Reference to the widget for border calculations
     */
    drawSymmetricalNumber(charGrid, centerX, centerY, radius, number, referenceNumber, widget) {
        // First, calculate the reference number's position
        const refAngleRadians = (referenceNumber * 30 - 90) * Math.PI / 180;
        const refPosX = Math.round(centerX + radius * Math.cos(refAngleRadians) * Y_TO_X_CHARS_DIMENSIONS_RATIO);
        const refPosY = Math.round(centerY + radius * Math.sin(refAngleRadians));
        
        // Calculate the distance from the border for the reference number
        let refBorderDistanceX, refBorderDistanceY;
        
        if (referenceNumber === 3) {
            // Distance from right border to '3'
            refBorderDistanceX = (widget.x + widget.w - 1) - refPosX;
            // For 9 (opposite to 3), we want the same distance from left border
            const targetPosX = widget.x + refBorderDistanceX;
            
            // Draw the number '9'
            const numberText = number.toString();
            setChar(charGrid, targetPosX, refPosY, numberText);
        } 
        else if (referenceNumber === 6) {
            // Distance from bottom border to '6'
            refBorderDistanceY = (widget.y + widget.h - 1) - refPosY;
            // For 12 (opposite to 6), we want the same distance from top border
            const targetPosY = widget.y + refBorderDistanceY;
            
            // Draw the number '12' (two characters)
            const numberText = number.toString();
            setChar(charGrid, centerX - 1, targetPosY, numberText[0]);
            setChar(charGrid, centerX, targetPosY, numberText[1]);
        }
    }

    drawClockHand(charGrid, centerX, centerY, angleDegrees, handLength, handChar) {
        const angleRadians = (angleDegrees - 90) * Math.PI / 180;
        const endX = Math.round(centerX + handLength * Math.cos(angleRadians) * Y_TO_X_CHARS_DIMENSIONS_RATIO);
        const endY = Math.round(centerY + handLength * Math.sin(angleRadians));
        drawLine(charGrid, centerX, centerY, endX, endY, handChar);
    }
}