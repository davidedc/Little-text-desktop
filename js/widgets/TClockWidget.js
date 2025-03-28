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
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 12);
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 3);
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 6);
            this.drawClockNumber(charGrid, centerX, centerY, clockRadius, 9);
        }

        // Calculate hand angles
        const secondAngle = this.seconds * 6;
        const minuteAngle = this.minutes * 6 + this.seconds / 10;
        const hourAngle = (this.hours % 12) * 30 + this.minutes / 2;

        // Draw clock hands
        this.drawClockHand(charGrid, centerX, centerY, secondAngle, clockRadius * 0.9, '.');
        this.drawClockHand(charGrid, centerX, centerY, minuteAngle, clockRadius * 0.7, 'M');
        this.drawClockHand(charGrid, centerX, centerY, hourAngle, clockRadius * 0.5, 'H');
        setChar(charGrid, centerX, centerY, 'o');
    }

    drawClockNumber(charGrid, centerX, centerY, radius, number) {
        const angleRadians = (number * 30 - 90) * Math.PI / 180;
        const posX = Math.round(centerX + radius * Math.cos(angleRadians) * Y_TO_X_CHARS_DIMENSIONS_RATIO);
        const posY = Math.round(centerY + radius * Math.sin(angleRadians));
        const numberText = number.toString();

        if (numberText.length === 1) {
            setChar(charGrid, posX, posY, numberText);
        } else {
            setChar(charGrid, posX - 1, posY, numberText[0]);
            setChar(charGrid, posX, posY, numberText[1]);
        }
    }

    drawClockHand(charGrid, centerX, centerY, angleDegrees, handLength, handChar) {
        const angleRadians = (angleDegrees - 90) * Math.PI / 180;
        const endX = Math.round(centerX + handLength * Math.cos(angleRadians) * Y_TO_X_CHARS_DIMENSIONS_RATIO);
        const endY = Math.round(centerY + handLength * Math.sin(angleRadians));
        drawLine(charGrid, centerX, centerY, endX, endY, handChar);
    }
}