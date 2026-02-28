# Wiretext Layout Rules Reference

Strict layout constraints for generating wireframe screens. These rules are enforced by both the AI prompt and the `sanitizeWireObjects()` function.

## Grid System

The wiretext grid is character-based: 1 cell = 1 character wide, 1 character tall.

## Browser Container (Required)

Every screen MUST start with a browser component as the outermost wrapper:

```json
{ "type": "component", "componentType": "browser", "position": { "col": 0, "row": 0 }, "width": 80, "height": 40, "label": "https://app.example.com", "zIndex": 0 }
```

- Position: always `col: 0, row: 0`
- Width: always `80`
- Height: calculate based on content — must be tall enough to fit ALL children
- zIndex: `0`

## Child Placement Rules

All children must fit inside the browser's inner area:

### Column Bounds
- Minimum column: `1` (browser left border is at col 0)
- Maximum right edge: `78` (browser right border is at col 79)
- Constraint: `child.col >= 1` AND `child.col + child.width <= 79`
- NEVER place a child at col 0 or let its right edge reach col 79+

### Row Bounds
- Start at row `2` (rows 0-1 are the browser chrome/title bar)
- Leave at least 1 row before the browser's bottom border

### zIndex
- All children use `zIndex: 1`

## No Overlapping

### Vertical Stacking
- Elements stacked vertically must NOT share any rows
- Leave at least 1 row gap between vertical elements
- Plan layout top-to-bottom: navbar (row 2), title (row 5), content sections below

### Horizontal Side-by-Side
- Elements placed side by side must satisfy: `left.col + left.width + 1 <= right.col`
- Always leave at least 1 column gap between horizontal elements

### Example: Three Cards in a Row (width 80 browser)
```
Card 1: col 3, width 24  (occupies cols 3-26)
Card 2: col 29, width 24 (occupies cols 29-52) -- gap at cols 27-28
Card 3: col 55, width 23 (occupies cols 55-77) -- gap at cols 53-54
```

## Sizing Rules

### Width Minimums (for labeled components)
| Component | Minimum Width Formula |
|-----------|----------------------|
| Button | label.length + 4 |
| Select | label.length + 5 |
| Input | label.length + 6 |
| Card | label.length + 4 |
| Alert | label.length + 4 |
| Tabs | label.length + 4 |
| Others | label.length + 4 (default) |

### Height Minimums
- **Bordered components** (button, input, select, card, browser, table, tabs, progress, icon, image, alert, avatar): height >= 3
- **Borderless components** (checkbox, radio, toggle, divider, breadcrumb, list, stepper, rating, skeleton): height can be 1

## Complexity Guidelines

- Use **8-12 objects per screen** maximum
- Fewer objects = cleaner, more readable wireframe
- Prefer cards, text, tables, and buttons
- Avoid deeply nested layouts
- Focus on showing the product's core value, not every UI detail

## Screens to Include

- Generate **3-5 core screens** that show the product's main functionality
- DO NOT include generic screens: Login, Sign Up, Settings, Profile, 404, Landing Page
- Good examples: Dashboard, Product Detail, Marketplace, Feed, Editor, Analytics

## Complete Layout Example

```json
{
  "name": "Dashboard",
  "objects": [
    { "type": "component", "componentType": "browser", "position": { "col": 0, "row": 0 }, "width": 80, "height": 40, "label": "https://app.example.com/dashboard", "zIndex": 0 },
    { "type": "component", "componentType": "navbar", "position": { "col": 1, "row": 2 }, "width": 78, "navItems": ["Dashboard", "Projects", "Analytics"], "zIndex": 1 },
    { "type": "text", "position": { "col": 3, "row": 5 }, "content": "Welcome back, User", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 3, "row": 7 }, "width": 24, "height": 7, "label": "Active Projects", "body": "12", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 29, "row": 7 }, "width": 24, "height": 7, "label": "Tasks Due", "body": "5", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 55, "row": 7 }, "width": 23, "height": 7, "label": "Team Members", "body": "8", "zIndex": 1 },
    { "type": "component", "componentType": "table", "position": { "col": 3, "row": 16 }, "width": 75, "height": 12, "columns": ["Project", "Status", "Due Date"], "rows": 4, "zIndex": 1 },
    { "type": "component", "componentType": "button", "position": { "col": 3, "row": 30 }, "label": "New Project", "width": 17, "zIndex": 1 }
  ]
}
```

Key observations:
- All children: `col >= 1` and `col + width <= 78`
- Rows are spaced apart with gaps (2, 5, 7, 16, 30)
- Three cards fit horizontally: 3+24=27, 29+24=53, 55+23=78
- Browser height 40 contains all content (last element at row 30 + button height 3 = 33 < 40)

## Sanitizer Auto-Fixes

The `sanitizeWireObjects()` function corrects these issues automatically, but the AI prompt should still enforce them to minimize corrections:

1. Missing position -> defaults to `{ col: 0, row: 0 }`
2. Width < label + padding -> expanded to minimum
3. Bordered component height < 3 -> set to 3
4. col < 1 for non-browser -> clamped to 1
5. col + width > maxCol -> width shrunk to fit
6. Arrow/connector missing endPosition -> default added (20 cols right)
