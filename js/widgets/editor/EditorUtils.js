// Move cursor left and adjust window scroll position
function editorLeft(editorWindow, textBuffer, editorCursor) {
    editorCursor.left(textBuffer);
    editorWindow.up(editorCursor);
    editorWindow.horizontal_scroll(editorCursor);
}

// Move cursor right and adjust window scroll position 
function editorRight(editorWindow, textBuffer, editorCursor) {
    if (!editorCursor || !textBuffer || !editorWindow) {
        return;
    }
    
    editorCursor.right(textBuffer);
    editorWindow.down(textBuffer, editorCursor);
    editorWindow.horizontal_scroll(editorCursor);
}