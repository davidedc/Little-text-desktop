// Move cursor left and adjust window scroll position
function editorLeft(editorWindow, textBuffer, editorCursor) {
    editorCursor.left(textBuffer);
    editorWindow.up(editorCursor);
    editorWindow.horizontal_scroll(editorCursor);
}

// Move cursor right and adjust window scroll position 
function editorRight(editorWindow, textBuffer, editorCursor) {
    console.log("[DEBUG] editorRight - before: cursor:", editorCursor ? `row:${editorCursor.row}, col:${editorCursor.col}` : "null", 
                "textBuffer:", textBuffer ? `length:${textBuffer.length}` : "null",
                "editorWindow:", editorWindow ? `r:${editorWindow.row}, c:${editorWindow.col}` : "null");
                
    try {
        if (!editorCursor || !textBuffer) {
            console.error("[ERROR] editorRight - Missing required objects");
            return;
        }
        
        editorCursor.right(textBuffer);
        
        if (!editorWindow) {
            console.error("[ERROR] editorRight - Missing editorWindow");
            return;
        }
        
        editorWindow.down(textBuffer, editorCursor);
        editorWindow.horizontal_scroll(editorCursor);
        
        console.log("[DEBUG] editorRight - after: cursor:", `row:${editorCursor.row}, col:${editorCursor.col}`);
    } catch (err) {
        console.error("[ERROR] Exception in editorRight:", err);
    }
}