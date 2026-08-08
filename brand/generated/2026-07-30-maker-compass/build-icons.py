#!/usr/bin/env python3
"""Author the Maker Compass UI icon set.

Rules, applied uniformly and not per-icon: 24x24 viewBox, 1.5px stroke,
`stroke="currentColor"` so icons inherit text colour, butt caps and miter joins
for square-cut terminals, no fills, and geometry snapped to a 2px grid wherever
the form allows. Curves are used only where a form is genuinely round (the
search lens, the info disc); everything else stays angular to echo the wedge.

Icons never carry Action Red. Red is commitment; an icon is navigation.
"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(OUT, "icons")

# name -> list of SVG shape elements (stroke attrs are applied by the wrapper)
SET = {
    "arrow-right": [
        '<path d="M3.5 12 H20.5"/>',
        '<path d="M13.5 5 L20.5 12 L13.5 19"/>',
    ],
    "check": ['<path d="M4 12.5 L9.5 18 L20 6.5"/>'],
    "close": [
        '<path d="M5.5 5.5 L18.5 18.5"/>',
        '<path d="M18.5 5.5 L5.5 18.5"/>',
    ],
    "plus": ['<path d="M12 3.5 V20.5"/>', '<path d="M3.5 12 H20.5"/>'],
    "menu": [
        '<path d="M3.5 7 H20.5"/>',
        '<path d="M3.5 12 H20.5"/>',
        '<path d="M3.5 17 H20.5"/>',
    ],
    "search": [
        '<circle cx="10.5" cy="10.5" r="6.5"/>',
        '<path d="M15.5 15.5 L20.5 20.5"/>',
    ],
    "user": [
        '<circle cx="12" cy="8" r="4"/>',
        # Angular shoulders rather than an arc: the silhouette echoes the wedge.
        '<path d="M4.5 20.5 V18.5 L8.5 15 H15.5 L19.5 18.5 V20.5"/>',
    ],
    "settings": [
        # Rails with vertical position ticks. Boxed handles read as solid blobs
        # once the 1.5px stroke closes a 4px square at icon size.
        '<path d="M3.5 7 H20.5"/>',
        '<path d="M3.5 12 H20.5"/>',
        '<path d="M3.5 17 H20.5"/>',
        '<path d="M8 4.5 V9.5"/>',
        '<path d="M16 9.5 V14.5"/>',
        '<path d="M11 14.5 V19.5"/>',
    ],
    "bell": [
        # A curved shoulder is the only silhouette that reads as a bell; the
        # angular version read as a lamp.
        '<path d="M6.5 17.5 V12 C6.5 8.9 8.9 6.5 12 6.5 C15.1 6.5 17.5 8.9 17.5 12 V17.5"/>',
        '<path d="M4 17.5 H20"/>',
        '<path d="M10 20.5 H14"/>',
    ],
    "info": [
        '<circle cx="12" cy="12" r="8.5"/>',
        '<path d="M12 11 V16.5"/>',
        '<path d="M12 7.5 V9"/>',
    ],
    # Brand-specific: the two artifacts the product is actually about.
    "scope": [
        '<path d="M9 4.5 H4.5 V19.5 H9"/>',
        '<path d="M15 4.5 H19.5 V19.5 H15"/>',
        '<path d="M12 9 V15"/>',
    ],
    "build-map": [
        # One trajectory, three evenly spaced milestones. Earlier cuts bunched two
        # nodes within a few px and the glyph closed up into a blob at 18px.
        '<path d="M4.5 19 L19.5 6.5"/>',
        '<rect x="2.75" y="17.25" width="3.5" height="3.5"/>',
        '<rect x="10.25" y="11" width="3.5" height="3.5"/>',
        '<rect x="17.75" y="4.75" width="3.5" height="3.5"/>',
    ],
}

WRAPPER = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" '
    'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" '
    'stroke-linejoin="miter" role="img" aria-label="{name}">{body}</svg>'
)


def main():
    os.makedirs(ICONS, exist_ok=True)
    for name, shapes in SET.items():
        svg = WRAPPER.format(name=name.replace("-", " "), body="".join(shapes))
        with open(os.path.join(ICONS, f"{name}.svg"), "w") as fh:
            fh.write(svg)
    print(f"wrote {len(SET)} icons to icons/")


if __name__ == "__main__":
    main()
