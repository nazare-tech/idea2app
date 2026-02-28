# Wiretext Object Schema Reference

Complete schema for all wiretext object types supported by `@wiretext/mcp`.

## Position Format

ALL objects use position as `{ "col": NUMBER, "row": NUMBER }`.
NEVER use `x`, `y`, `left`, `top`, or any other position format.

## Primitive Types

These use their own `type` value directly (not wrapped in `component`).

### Box
```json
{ "type": "box", "position": { "col": 0, "row": 0 }, "width": 20, "height": 10, "label": "Title" }
```

### Text
```json
{ "type": "text", "position": { "col": 0, "row": 0 }, "content": "Hello World" }
```
**Important:** Text uses `content` field, NOT `label` or `text`.

### Line
```json
{ "type": "line", "position": { "col": 0, "row": 0 }, "endPosition": { "col": 20, "row": 0 } }
```

### Arrow
```json
{ "type": "arrow", "position": { "col": 0, "row": 0 }, "endPosition": { "col": 20, "row": 5 } }
```
**Required:** `endPosition` must always be present.

### Connector
```json
{ "type": "connector", "position": { "col": 0, "row": 0 }, "endPosition": { "col": 20, "row": 10 } }
```
**Required:** `endPosition` must always be present.

## Component Types

All UI components use `type: "component"` with a `componentType` field.

### Button
```json
{ "type": "component", "componentType": "button", "position": { "col": 0, "row": 0 }, "label": "Click Me", "width": 14 }
```
- Width padding: label.length + 4
- Height: minimum 3 (bordered)

### Input
```json
{ "type": "component", "componentType": "input", "position": { "col": 0, "row": 0 }, "label": "Username", "width": 30 }
```
- Width padding: label.length + 6
- Height: minimum 3 (bordered)

### Select
```json
{ "type": "component", "componentType": "select", "position": { "col": 0, "row": 0 }, "label": "Choose...", "width": 20 }
```
- Width padding: label.length + 5
- Height: minimum 3 (bordered)

### Checkbox
```json
{ "type": "component", "componentType": "checkbox", "position": { "col": 0, "row": 0 }, "label": "Remember me", "checked": true }
```
- Borderless, height can be 1

### Radio
```json
{ "type": "component", "componentType": "radio", "position": { "col": 0, "row": 0 }, "label": "Option A" }
```
- Borderless, height can be 1

### Toggle
```json
{ "type": "component", "componentType": "toggle", "position": { "col": 0, "row": 0 }, "label": "Dark mode", "checked": false }
```
- Borderless, height can be 1

### Table
```json
{ "type": "component", "componentType": "table", "position": { "col": 0, "row": 0 }, "width": 60, "height": 10, "columns": ["Name", "Status", "Date"], "rows": 5 }
```
- `columns`: array of column header strings
- `rows`: number of data rows
- Height: minimum 3 (bordered)

### Card
```json
{ "type": "component", "componentType": "card", "position": { "col": 0, "row": 0 }, "width": 30, "height": 10, "label": "Title", "body": "Content here" }
```
- `label`: card title
- `body`: card content text
- Height: minimum 3 (bordered)

### Browser
```json
{ "type": "component", "componentType": "browser", "position": { "col": 0, "row": 0 }, "width": 80, "height": 35, "label": "https://example.com" }
```
- Always the outermost container
- `label`: URL displayed in browser chrome
- Standard width: 80 (provides usable inner cols 1-78)
- Height: calculate based on content inside
- Use `zIndex: 0`

### Navbar
```json
{ "type": "component", "componentType": "navbar", "position": { "col": 0, "row": 0 }, "width": 78, "navItems": ["Home", "Dashboard", "Settings"] }
```
- `navItems`: array of navigation link labels
- Typically width 78 (full browser inner width)

### Tabs
```json
{ "type": "component", "componentType": "tabs", "position": { "col": 0, "row": 0 }, "width": 60, "height": 20, "tabs": ["Tab 1", "Tab 2", "Tab 3"] }
```
- `tabs`: array of tab label strings
- Height: minimum 3 (bordered)

### Progress
```json
{ "type": "component", "componentType": "progress", "position": { "col": 0, "row": 0 }, "width": 30, "progress": 75 }
```
- `progress`: percentage value (0-100)
- Height: minimum 3 (bordered)

### Icon
```json
{ "type": "component", "componentType": "icon", "position": { "col": 0, "row": 0 }, "icon": "star" }
```
- `icon`: unicode character or name
- Height: minimum 3 (bordered)

### Image
```json
{ "type": "component", "componentType": "image", "position": { "col": 0, "row": 0 }, "width": 20, "height": 10, "label": "Photo" }
```
- Renders as a placeholder box with label
- Height: minimum 3 (bordered)

### Divider
```json
{ "type": "component", "componentType": "divider", "position": { "col": 0, "row": 0 }, "width": 60 }
```
- Horizontal separator line
- Borderless, height can be 1

### Alert
```json
{ "type": "component", "componentType": "alert", "position": { "col": 0, "row": 0 }, "width": 40, "label": "Warning message", "alertType": "warning" }
```
- `alertType`: "warning", "error", "info", "success"
- Width padding: label.length + 4
- Height: minimum 3 (bordered)

### Avatar
```json
{ "type": "component", "componentType": "avatar", "position": { "col": 0, "row": 0 }, "label": "JD" }
```
- `label`: initials or short text
- Height: minimum 3 (bordered)

### Breadcrumb
```json
{ "type": "component", "componentType": "breadcrumb", "position": { "col": 0, "row": 0 }, "items": ["Home", "Products", "Detail"] }
```
- `items`: array of breadcrumb path segments
- Borderless, height can be 1

### List
```json
{ "type": "component", "componentType": "list", "position": { "col": 0, "row": 0 }, "items": ["Item 1", "Item 2", "Item 3"] }
```
- `items`: array of list item strings
- Borderless, height can be 1

### Stepper
```json
{ "type": "component", "componentType": "stepper", "position": { "col": 0, "row": 0 }, "items": ["Step 1", "Step 2", "Step 3"], "activeStep": 1 }
```
- `items`: array of step labels
- `activeStep`: 0-based index of active step
- Borderless, height can be 1

### Rating
```json
{ "type": "component", "componentType": "rating", "position": { "col": 0, "row": 0 }, "value": 3, "maxValue": 5 }
```
- `value`: current rating
- `maxValue`: maximum rating
- Borderless, height can be 1

### Skeleton
```json
{ "type": "component", "componentType": "skeleton", "position": { "col": 0, "row": 0 }, "width": 40, "height": 3 }
```
- Loading placeholder
- Borderless, height can be 1

## Bordered vs Borderless Components

**Bordered** (minimum height: 3): button, input, select, card, browser, table, tabs, progress, icon, image, alert, avatar

**Borderless** (height can be 1): checkbox, radio, toggle, divider, breadcrumb, list, stepper, rating, skeleton

## zIndex Convention

- `zIndex: 0` for the browser container
- `zIndex: 1` for all children inside the browser
