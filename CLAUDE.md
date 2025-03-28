# CLAUDE.md - Guidelines for Little Text Desktop

## Build Commands
- **Run locally**: Open `index.html` in a browser
- **Deploy**: Push to GitHub to update GitHub Pages at https://davidedc.github.io/Little-text-desktop/

## Code Style Guidelines

### JavaScript
- Use ES6 class syntax for object-oriented code
- Use descriptive variable and function names
- Follow camelCase for variables and functions
- Class names should use PascalCase
- Constants should use UPPER_SNAKE_CASE
- Use helpful inline comments for non-obvious code sections
- Maintain clear function/method documentation with JSDoc

### HTML/CSS
- Use 4-space indentation
- CSS classes should use kebab-case

### Error Handling
- Use defensive programming with bounds checking (clamp function)
- Handle edge cases for widget dimensions and positioning
- Validate input parameters in constructors

### Architecture
- Follow a clean separation between UI rendering and widget logic
- Use proper event handling for mouse and keyboard interactions
- Maintain consistent structure across widget implementations