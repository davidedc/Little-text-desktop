/**
 * Clamps a value between a minimum and maximum.
 * @param {number} x - The value to clamp
 * @param {number} lower - The lower bound
 * @param {number} upper - The upper bound
 * @returns {number} The clamped value
 */
function clamp(x, lower, upper) {
    if (x < lower) return lower;
    if (x > upper) return upper;
    return x;
}

/**
 * Escapes characters for safe HTML embedding.
 * @param {string} unsafeText - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(unsafeText) {
    if (typeof unsafeText !== 'string') return unsafeText;
    if (unsafeText.startsWith('&#') && unsafeText.endsWith(';')) return unsafeText;
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;") 
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Wraps text to a maximum width.
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in characters
 * @returns {string[]} Array of wrapped lines
 */
function wrapText(text, maxWidth) {
    if (!text || maxWidth <= 0) return [];
    const textLines = text.split('\n');
    const wrappedLines = [];

    textLines.forEach(textLine => {
        if (textLine.length <= maxWidth) {
            wrappedLines.push(textLine);
        } else {
            const words = textLine.split(' ');
            let currentLine = '';

            words.forEach(word => {
                if (currentLine.length === 0) {
                    if (word.length > maxWidth) {
                        wrappedLines.push(word.substring(0, maxWidth));
                        currentLine = '';
                    } else {
                        currentLine = word;
                    }
                } else if (currentLine.length + word.length + 1 <= maxWidth) {
                    currentLine += ' ' + word;
                } else {
                    wrappedLines.push(currentLine);
                    if (word.length > maxWidth) {
                        wrappedLines.push(word.substring(0, maxWidth));
                        currentLine = '';
                    } else {
                        currentLine = word;
                    }
                }
            });

            if (currentLine) {
                wrappedLines.push(currentLine);
            }
        }
    });

    return wrappedLines;
}

/**
 * Draws a line between two points on a character grid.
 * @param {Array} charGrid - The character grid
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} endX - Ending X coordinate
 * @param {number} endY - Ending Y coordinate
 * @param {string} lineChar - Character to use for the line
 */
function drawLine(charGrid, startX, startY, endX, endY, lineChar) {
    startX = Math.round(startX);
    startY = Math.round(startY);
    endX = Math.round(endX);
    endY = Math.round(endY);

    const deltaX = Math.abs(endX - startX);
    const deltaY = Math.abs(endY - startY);
    const stepX = startX < endX ? 1 : -1;
    const stepY = startY < endY ? 1 : -1;
    let error = deltaX - deltaY;

    while (true) {
        setChar(charGrid, startX, startY, lineChar);
        if (startX === endX && startY === endY) break;

        const errorDouble = 2 * error;
        if (errorDouble > -deltaY) {
            error -= deltaY;
            startX += stepX;
        }
        if (errorDouble < deltaX) {
            error += deltaX;
            startY += stepY;
        }
    }
}

/**
 * Sets a character or Cell at a specific coordinate in the character grid.
 * @param {Array} charGrid - The character grid
 * @param {number} posX - X coordinate
 * @param {number} posY - Y coordinate
 * @param {string|Cell} content - Character or Cell to set
 */
function setChar(charGrid, posX, posY, content) {
    if (posX >= 0 && posX < GRID_WIDTH_chars && posY >= 0 && posY < GRID_HEIGHT_chars) {
        // If we received a plain character, convert it to a Cell
        if (!(content instanceof Cell)) {
            if (typeof content !== 'string') content = ' ';
            content = new Cell(content, false);
        }
        charGrid[posY][posX] = content;
    }
}