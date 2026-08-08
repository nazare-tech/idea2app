#!/usr/bin/env python3
"""Build the Maker Compass bearing-wedge symbol.

Vector master is authored here as exact geometry, then rasterised with 4x
supersampling so the PNG exports stay crisp at favicon sizes. Two silhouettes:
the full notched wedge for 64px and up, and a simplified solid wedge for
16/32px where the tail notch collapses into noise.
"""
import json
import math
import os

from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
BOX = 1024
CENTER = BOX / 2
ROTATION_DEG = 32  # clockwise; needle points up-and-right, off-axis on purpose

COLORS = {
    "red": "#DC2626",
    "black": "#1C1917",
    "cream": "#F5F0EB",
    "white": "#FFFFFF",
}

# Needle authored pointing straight up, then rotated. Length 624, width 304.
WEDGE_NOTCHED = [(512, 96), (664, 720), (512, 616), (360, 720)]
WEDGE_SOLID = [(512, 96), (664, 720), (360, 720)]


def rotate(points, deg=ROTATION_DEG):
    rad = math.radians(deg)
    cos_r, sin_r = math.cos(rad), math.sin(rad)
    out = []
    for x, y in points:
        dx, dy = x - CENTER, y - CENTER
        out.append(
            (
                CENTER + dx * cos_r - dy * sin_r,
                CENTER + dx * sin_r + dy * cos_r,
            )
        )
    return out


def fit(points, occupancy=0.86):
    """Centre the rotated silhouette and scale it to fill the canvas.

    Rotation shrinks the apparent size and pushes the bounding box off centre,
    which made the mark read as timid at favicon sizes. Normalising here keeps
    every export optically the same weight.
    """
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    scale = (BOX * occupancy) / span
    mid_x = (max(xs) + min(xs)) / 2
    mid_y = (max(ys) + min(ys)) / 2
    return [
        (CENTER + (x - mid_x) * scale, CENTER + (y - mid_y) * scale)
        for x, y in points
    ]


def path_d(points):
    head = f"M {points[0][0]:.2f} {points[0][1]:.2f}"
    rest = " ".join(f"L {x:.2f} {y:.2f}" for x, y in points[1:])
    return f"{head} {rest} Z"


def write_svg(name, points, fill):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX} {BOX}" '
        f'width="{BOX}" height="{BOX}" role="img" aria-label="Maker Compass symbol">'
        f'<path d="{path_d(points)}" fill="{fill}"/>'
        f"</svg>"
    )
    dest = os.path.join(OUT, "logo", "symbol", name)
    with open(dest, "w") as fh:
        fh.write(svg)
    return dest


def render_png(points, hexcolor, size, dest):
    ss = 4  # supersample factor
    canvas = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    scale = (size * ss) / BOX
    rgb = tuple(int(hexcolor[i : i + 2], 16) for i in (1, 3, 5))
    draw.polygon([(x * scale, y * scale) for x, y in points], fill=rgb + (255,))
    canvas.resize((size, size), Image.LANCZOS).save(dest, "PNG", optimize=True)


def main():
    # Fit both silhouettes against the notched bbox so the two cuts stay
    # optically identical in weight and position.
    reference = rotate(WEDGE_NOTCHED)
    xs = [p[0] for p in reference]
    ys = [p[1] for p in reference]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    scale = (BOX * 0.86) / span
    mid_x, mid_y = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2

    def place(points):
        return [
            (CENTER + (x - mid_x) * scale, CENTER + (y - mid_y) * scale)
            for x, y in points
        ]

    notched = place(reference)
    solid = place(rotate(WEDGE_SOLID))

    manifest = {"rotation_deg": ROTATION_DEG, "viewbox": BOX, "files": []}

    # Vector masters: the notched wedge is canonical, solid is the small-size cut.
    for key, hexcolor in COLORS.items():
        manifest["files"].append(write_svg(f"symbol-{key}.svg", notched, hexcolor))
    manifest["files"].append(write_svg("symbol-red-small.svg", solid, COLORS["red"]))

    sizes = [16, 32, 64, 128, 256, 512, 1024, 2048]
    for key, hexcolor in COLORS.items():
        for size in sizes:
            points = solid if size <= 32 else notched
            dest = os.path.join(OUT, "logo", "symbol", f"symbol-{key}-{size}.png")
            render_png(points, hexcolor, size, dest)
            manifest["files"].append(dest)

    manifest["geometry"] = {
        "notched": [[round(x, 2), round(y, 2)] for x, y in notched],
        "solid": [[round(x, 2), round(y, 2)] for x, y in solid],
    }
    with open(os.path.join(OUT, "logo", "symbol", "geometry.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"wrote {len(manifest['files'])} symbol files")


if __name__ == "__main__":
    main()
