#!/usr/bin/env python3
"""Outline the MakerCompass wordmark and assemble the lockups.

The ownable detail is structural, not decorative: one word, no space, with
`Maker` at weight 800 against `Compass` at weight 500 and tracking pulled to
-0.045em. The weight break carries the hierarchy the brand argues for -
direction first, subject second - and survives being reduced to a single
colour, which a two-tone wordmark would not.

Glyphs are converted to real outlines so the SVG has no font dependency.
"""
import json
import os
import subprocess

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(OUT, "fonts", "HankenGrotesk[wght].ttf")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TRACKING_EM = -0.045
SEGMENTS = [("Maker", 800), ("Compass", 500)]
COLORS = {
    "red": "#DC2626",
    "black": "#1C1917",
    "cream": "#F5F0EB",
    "white": "#FFFFFF",
}
CAP_PAD = 0.06  # breathing room above cap height / below baseline, in em


def instance(weight):
    font = TTFont(FONT)
    return instancer.instantiateVariableFont(font, {"wght": weight})


def kern_pair(font, left, right):
    """Best-effort GPOS kern lookup so the tight tracking does not collide."""
    try:
        gpos = font["GPOS"].table
    except KeyError:
        return 0
    cmap = font.getBestCmap()
    lg, rg = cmap.get(ord(left)), cmap.get(ord(right))
    if not lg or not rg:
        return 0
    for lookup in gpos.LookupList.Lookup:
        if lookup.LookupType != 2:
            continue
        for sub in lookup.SubTable:
            if sub.Format == 1:
                try:
                    idx = sub.Coverage.glyphs.index(lg)
                except ValueError:
                    continue
                for record in sub.PairSet[idx].PairValueRecord:
                    if record.SecondGlyph == rg and record.Value1:
                        return record.Value1.XAdvance or 0
            elif sub.Format == 2:
                c1 = sub.ClassDef1.classDefs.get(lg, 0)
                c2 = sub.ClassDef2.classDefs.get(rg, 0)
                try:
                    record = sub.Class1Record[c1].Class2Record[c2]
                except (IndexError, AttributeError):
                    continue
                if record.Value1:
                    return record.Value1.XAdvance or 0
    return 0


def build_paths():
    """Return (path_d, width_em, cap_em, descender_em) in font units."""
    fonts = {w: instance(w) for _, w in SEGMENTS}
    upem = fonts[SEGMENTS[0][1]]["head"].unitsPerEm
    tracking = TRACKING_EM * upem

    pieces = []
    x = 0.0
    letters = [(ch, w) for text, w in SEGMENTS for ch in text]
    for i, (ch, weight) in enumerate(letters):
        font = fonts[weight]
        glyph_set = font.getGlyphSet()
        name = font.getBestCmap()[ord(ch)]
        pen = SVGPathPen(glyph_set)
        glyph_set[name].draw(pen)
        d = pen.getCommands()
        if d:
            pieces.append(f'<path transform="translate({x:.2f} 0)" d="{d}"/>')
        x += glyph_set[name].width + tracking
        if i + 1 < len(letters):
            nxt, nxt_w = letters[i + 1]
            if weight == nxt_w:
                x += kern_pair(font, ch, nxt)

    width = x - tracking
    cap = fonts[SEGMENTS[0][1]]["OS/2"].sCapHeight
    desc = abs(fonts[SEGMENTS[0][1]]["hhea"].descent)
    return pieces, width, upem, cap, desc


def write_wordmark_svg(pieces, width, upem, cap, desc, fill, dest):
    pad = CAP_PAD * upem
    # The box must clear the `p` descender in Compass, not just cap height.
    vb_h = cap + desc + pad * 2
    vb_w = width + pad * 0.4
    # Font space is y-up from the baseline; flip into SVG's y-down space.
    body = "".join(pieces)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w:.2f} {vb_h:.2f}" '
        f'width="{vb_w:.0f}" height="{vb_h:.0f}" role="img" aria-label="MakerCompass">'
        f'<g fill="{fill}" transform="translate({pad * 0.2:.2f} {cap + pad:.2f}) scale(1 -1)">'
        f"{body}</g></svg>"
    )
    with open(dest, "w") as fh:
        fh.write(svg)
    return vb_w, vb_h


def write_lockup_svg(word_w, word_h, cap_px, pad_px, fill, orientation, dest):
    """Symbol + wordmark at locked measurements.

    Cap height is the unit of measure - not the wordmark box, which also carries
    the descender and padding. Horizontal: symbol 1.3 cap, gap 0.5 cap. Stacked:
    symbol 1.9 cap, gap 0.45 cap. Those ratios are fixed across every colour
    variant so the lockup never drifts.
    """
    geometry = json.load(
        open(os.path.join(OUT, "logo", "symbol", "geometry.json"))
    )["geometry"]["notched"]
    box = 1024
    pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in geometry)

    if orientation == "horizontal":
        sym = cap_px * 1.3
        gap = cap_px * 0.5
        total_w = sym + gap + word_w
        total_h = max(sym, word_h)
        word_y = (total_h - word_h) / 2
        # Optically centre on the cap band, not the box: the descender would
        # otherwise drag the symbol below the wordmark's visual midline.
        sym_y = word_y + pad_px + cap_px / 2 - sym / 2
        word_x = sym + gap
    else:
        sym = cap_px * 1.9
        gap = cap_px * 0.45
        total_w = max(sym, word_w)
        total_h = sym + gap + word_h
        sym_y = 0
        word_y = sym + gap
        word_x = (total_w - word_w) / 2
        sym_x_offset = (total_w - sym) / 2

    sym_x = 0 if orientation == "horizontal" else sym_x_offset
    scale = sym / box

    with open(
        os.path.join(OUT, "logo", "wordmark", "wordmark-black.svg")
    ) as fh:
        inner = fh.read()
    inner = inner[inner.index("<g") : inner.rindex("</svg>")]
    inner = inner.replace('fill="#1C1917"', f'fill="{fill}"', 1)

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.2f} {total_h:.2f}" '
        f'width="{total_w:.0f}" height="{total_h:.0f}" role="img" aria-label="MakerCompass">'
        f'<g transform="translate({sym_x:.2f} {sym_y:.2f}) scale({scale:.6f})">'
        f'<polygon points="{pts}" fill="{fill}"/></g>'
        f'<svg x="{word_x:.2f}" y="{word_y:.2f}" width="{word_w:.2f}" height="{word_h:.2f}" '
        f'viewBox="0 0 {word_w:.2f} {word_h:.2f}">{inner}</svg>'
        f"</svg>"
    )
    with open(dest, "w") as fh:
        fh.write(svg)


def rasterize(svg_path, png_path, width, bg="transparent"):
    """Chrome headless renders the SVG so the PNG matches the vector exactly."""
    html = svg_path + ".html"
    with open(svg_path) as fh:
        svg = fh.read()
    fluid = svg.replace(
        "<svg", "<svg style='width:100%;height:auto;display:block'", 1
    )
    with open(html, "w") as fh:
        fh.write(
            f'<body style="margin:0;background:{bg}">'
            f'<div style="width:{width}px">{fluid}</div>'
        )
    subprocess.run(
        [
            CHROME,
            "--headless",
            "--disable-gpu",
            "--default-background-color=00000000",
            f"--screenshot={png_path}",
            f"--window-size={width},{width}",
            "--hide-scrollbars",
            html,
        ],
        check=True,
        capture_output=True,
    )
    os.remove(html)
    # Chrome pads the shot to the window height; crop back to the artwork.
    subprocess.run(
        ["magick", png_path, "-trim", "+repage", png_path], check=True
    )


def main():
    pieces, width, upem, cap, desc = build_paths()
    dims = {}
    for key, hexcolor in COLORS.items():
        dest = os.path.join(OUT, "logo", "wordmark", f"wordmark-{key}.svg")
        dims[key] = write_wordmark_svg(pieces, width, upem, cap, desc, hexcolor, dest)

    word_w, word_h = dims["black"]
    for key, hexcolor in COLORS.items():
        write_lockup_svg(
            word_w,
            word_h,
            cap,
            CAP_PAD * 1000,
            hexcolor,
            "horizontal",
            os.path.join(OUT, "logo", "lockup", "horizontal", f"lockup-h-{key}.svg"),
        )
        write_lockup_svg(
            word_w,
            word_h,
            cap,
            CAP_PAD * 1000,
            hexcolor,
            "stacked",
            os.path.join(OUT, "logo", "lockup", "stacked", f"lockup-s-{key}.svg"),
        )

    for key in COLORS:
        rasterize(
            os.path.join(OUT, "logo", "wordmark", f"wordmark-{key}.svg"),
            os.path.join(OUT, "logo", "wordmark", f"wordmark-{key}.png"),
            1024,
        )
        rasterize(
            os.path.join(OUT, "logo", "lockup", "horizontal", f"lockup-h-{key}.svg"),
            os.path.join(OUT, "logo", "lockup", "horizontal", f"lockup-h-{key}.png"),
            1024,
        )
        rasterize(
            os.path.join(OUT, "logo", "lockup", "stacked", f"lockup-s-{key}.svg"),
            os.path.join(OUT, "logo", "lockup", "stacked", f"lockup-s-{key}.png"),
            1024,
        )

    print(f"wordmark viewBox {word_w:.1f}x{word_h:.1f} (upem {upem}, cap {cap})")


if __name__ == "__main__":
    main()
