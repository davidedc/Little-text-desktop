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
    // Avoid double-escaping if already an entity (simple check)
    // More robust check might involve regex, but this covers common cases.
    if (unsafeText.startsWith('&') && unsafeText.endsWith(';')) return unsafeText;
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Wraps text to a maximum width. Prioritizes wrapping at spaces.
 * If a single word is longer than maxWidth, it will be hard-wrapped.
 * @param {string} text - Text to wrap (should be a single logical line)
 * @param {number} maxWidth - Maximum width in characters
 * @returns {string[]} Array of wrapped lines (visual segments)
 */
function wrapText(text, maxWidth) {
    // Handle edge cases: no text, no width, or text already fits
    if (!text) return [];
    if (maxWidth <= 0) return [text]; // Cannot wrap to zero or negative width
    if (text.length <= maxWidth) return [text]; // No wrapping needed

    const words = text.split(' ');
    const wrappedLines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (word.length === 0) {
            // Handle multiple spaces: add a space if it fits
            if (currentLine.length > 0 && currentLine.length + 1 <= maxWidth) {
                currentLine += ' ';
            } else if (currentLine.length > 0) {
                // Space doesn't fit, push line and start new potentially empty line?
                // Or just ignore the extra space? Let's ignore for simplicity.
                wrappedLines.push(currentLine);
                currentLine = ''; // Reset for next word
            }
            // If currentLine is empty, the leading space is effectively ignored/handled by next word.
            continue;
        }


        if (word.length > maxWidth) {
            // Word is longer than the max width, hard wrap it
            if (currentLine.length > 0) {
                wrappedLines.push(currentLine); // Push previous line first
            }
            // Hard wrap the long word
            let remainingWord = word;
            while (remainingWord.length > maxWidth) {
                wrappedLines.push(remainingWord.substring(0, maxWidth));
                remainingWord = remainingWord.substring(maxWidth);
            }
            // The last part of the hard-wrapped word starts the next line
            currentLine = remainingWord;

        } else {
            // Word fits within max width
            if (currentLine.length === 0) {
                // Start new line with the word
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= maxWidth) {
                // Add word to current line with a preceding space
                currentLine += ' ' + word;
            } else {
                // Word doesn't fit on the current line, push current line and start new one
                wrappedLines.push(currentLine);
                currentLine = word;
            }
        }
    }

    // Push the last remaining line segment
    if (currentLine.length > 0) {
        wrappedLines.push(currentLine);
    }

    // Handle case where input was purely spaces longer than maxWidth
    // (The loop above might not handle this perfectly)
     if (wrappedLines.length === 0 && text.trim().length === 0 && text.length > 0) {
         let remainingSpaces = text;
          while (remainingSpaces.length > maxWidth) {
              wrappedLines.push(remainingSpaces.substring(0, maxWidth));
              remainingSpaces = remainingSpaces.substring(maxWidth);
          }
          if(remainingSpaces.length > 0) wrappedLines.push(remainingSpaces);
     }

    // Failsafe: If after all that, wrappedLines is empty but text wasn't, return original text array
    return wrappedLines.length > 0 ? wrappedLines : [text];
}


/**
 * Draws a line between two points on a character grid using Bresenham's line algorithm.
 * @param {Array<Array<Cell>>} charGrid - The character grid (2D array of Cell objects)
 * @param {number} startX - Starting X coordinate (integer)
 * @param {number} startY - Starting Y coordinate (integer)
 * @param {number} endX - Ending X coordinate (integer)
 * @param {number} endY - Ending Y coordinate (integer)
 * @param {string|Cell} lineChar - Character or Cell object to use for the line
 */
function drawLine(charGrid, startX, startY, endX, endY, lineChar) {
    // Ensure integer coordinates
    startX = Math.round(startX);
    startY = Math.round(startY);
    endX = Math.round(endX);
    endY = Math.round(endY);

    const deltaX = Math.abs(endX - startX);
    const deltaY = -Math.abs(endY - startY); // Use negative deltaY for standard algorithm form
    const stepX = startX < endX ? 1 : -1;
    const stepY = startY < endY ? 1 : -1;
    let error = deltaX + deltaY; // Initial error term

    let currentX = startX;
    let currentY = startY;
    let safetyCounter = 0; // Prevent infinite loops
    const maxSteps = deltaX + Math.abs(deltaY) + 2; // Max expected steps + buffer

    while (safetyCounter++ < maxSteps) {
        // Plot the current point
        setChar(charGrid, currentX, currentY, lineChar);

        // Check if we've reached the end point
        if (currentX === endX && currentY === endY) break;

        // Calculate error for next step
        const errorDouble = 2 * error;

        // Adjust error and coordinates based on algorithm steps
        // Check if need to step in X direction
        if (errorDouble >= deltaY) { // If error >= vertical change threshold
            if (currentX === endX) break; // Don't step X if already at end X
            error += deltaY;
            currentX += stepX;
        }
        // Check if need to step in Y direction
        if (errorDouble <= deltaX) { // If error <= horizontal change threshold
            if (currentY === endY) break; // Don't step Y if already at end Y
            error += deltaX;
            currentY += stepY;
        }
    }
     if (safetyCounter >= maxSteps && !(currentX === endX && currentY === endY)) {
         console.error("drawLine safety break triggered.", {startX, startY, endX, endY});
     }
}

/**
 * Sets a character or Cell at a specific coordinate in the character grid.
 * Handles boundary checks. Ensures content is a Cell object.
 * Relies on global GRID_WIDTH_chars and GRID_HEIGHT_chars being defined.
 * @param {Array<Array<Cell>>} charGrid - The character grid
 * @param {number} posX - X coordinate
 * @param {number} posY - Y coordinate
 * @param {string|Cell} content - Character or Cell object to set
 */
function setChar(charGrid, posX, posY, content) {
    // Check grid boundaries using global constants (must be accessible)
    if (typeof GRID_WIDTH_chars === 'undefined' || typeof GRID_HEIGHT_chars === 'undefined') {
        console.error("setChar: GRID_WIDTH_chars or GRID_HEIGHT_chars not defined.");
        return;
    }

    if (posX >= 0 && posX < GRID_WIDTH_chars && posY >= 0 && posY < GRID_HEIGHT_chars) {

        // Ensure the content is a Cell object
        let cellContent;
        if (content instanceof Cell) {
            cellContent = content;
        } else {
            // If not a Cell, create one. Handle null/undefined/non-string content.
            // Ensure we take only the first character if a string is passed.
            const char = (typeof content === 'string' && content.length > 0) ? content[0] : ' ';
            cellContent = new Cell(char, false); // Assume plain character if not Cell instance
        }

        // Assign the Cell object to the grid
        // Ensure the row exists in the grid array
        if (charGrid && charGrid[posY]) {
             charGrid[posY][posX] = cellContent;
        } else {
             // This might happen if grid initialization is faulty or posY is somehow invalid despite boundary check
             console.warn(`setChar: Attempted to write to potentially invalid grid row ${posY}`);
        }
    } else {
         // Optional: Log out-of-bounds attempts for debugging, can be noisy
         // console.warn(`setChar: Attempted write out of bounds at (${posX}, ${posY})`);
    }
}