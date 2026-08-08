#!/usr/bin/env python3
"""Composite real brand assets onto the blank touchpoint photographs.

The photos were generated deliberately blank: image models bake in garbled
pseudo-text and wrong-weight letterforms whenever a prompt mentions a logo. So
the surfaces come back empty and the actual artwork is perspective-mapped on
here, which keeps the mark correctly typeset and regenerable.

Screen and sticker quads are detected from the image (both are bright regions on
dark grounds); the tote panel is specified by hand because a beige bag on a beige
wall gives thresholding nothing to grip.
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(OUT, "images")
QA = os.path.join(OUT, "qa")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RED, INK, CLOUD, MUTED, LINE = "#DC2626", "#1C1917", "#FAFAFA", "#8A8480", "#EAE0D8"


def find_quad(img, roi, threshold):
    """Corners of the bright quadrilateral inside roi, as (tl, tr, br, bl)."""
    x0, y0, x1, y1 = roi
    gray = np.asarray(img.convert("L"), dtype=np.int16)[y0:y1, x0:x1]
    ys, xs = np.nonzero(gray > threshold)
    if len(xs) < 100:
        raise SystemExit(f"quad detection found only {len(xs)}px above {threshold}")
    xs, ys = xs + x0, ys + y0
    s, d = xs + ys, xs - ys
    return (
        (float(xs[np.argmin(s)]), float(ys[np.argmin(s)])),  # top-left
        (float(xs[np.argmax(d)]), float(ys[np.argmax(d)])),  # top-right
        (float(xs[np.argmax(s)]), float(ys[np.argmax(s)])),  # bottom-right
        (float(xs[np.argmin(d)]), float(ys[np.argmin(d)])),  # bottom-left
    )


def expand(quad, factor):
    """Scale a quad about its centroid.

    Corner detection on a rounded-corner label lands slightly inside the true
    edge, which leaves a rim of blank stock showing through the artwork.
    """
    cx = sum(p[0] for p in quad) / 4
    cy = sum(p[1] for p in quad) / 4
    return tuple(
        (cx + (x - cx) * factor, cy + (y - cy) * factor) for x, y in quad
    )


def perspective_coeffs(dest_quad, src_size):
    """Coefficients mapping the destination quad back to the artwork rectangle.

    PIL's PERSPECTIVE transform samples the source using an inverse map, so the
    solve runs destination -> source, not the other way round.
    """
    w, h = src_size
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    matrix = []
    for (dx, dy), (sx, sy) in zip(dest_quad, src):
        matrix.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        matrix.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    A = np.array(matrix, dtype=float)
    B = np.array(src, dtype=float).reshape(8)
    return np.linalg.solve(A, B)


def paste_quad(photo, artwork, quad, opacity=1.0):
    """Warp artwork (RGBA) onto quad and composite it over photo."""
    coeffs = perspective_coeffs(quad, artwork.size)
    warped = artwork.transform(
        photo.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC
    )
    if opacity < 1.0:
        alpha = warped.getchannel("A").point(lambda v: int(v * opacity))
        warped.putalpha(alpha)
    out = photo.convert("RGBA")
    out.alpha_composite(warped)
    return out


def render_html(html, size, dest):
    """Chrome renders artwork so type is real type, not a resampled bitmap."""
    path = os.path.join(OUT, "render", "_artwork.html")
    fonts = os.path.join(OUT, "fonts")
    with open(path, "w") as fh:
        fh.write(f"""<!doctype html><meta charset="utf-8"><style>
@font-face {{ font-family:"Hanken Grotesk"; src:url("file://{fonts}/HankenGrotesk[wght].ttf") format("truetype-variations"); font-weight:100 900; }}
@font-face {{ font-family:"Fira Mono"; src:url("file://{fonts}/FiraMono-Medium.ttf") format("truetype"); font-weight:500; }}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{size[0]}px;height:{size[1]}px;font-family:"Hanken Grotesk",sans-serif;
  -webkit-font-smoothing:antialiased}}
</style>{html}""")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--default-background-color=00000000", f"--screenshot={dest}",
         f"--window-size={size[0]},{size[1]}", path],
        check=True, capture_output=True,
    )
    os.remove(path)
    return Image.open(dest).convert("RGBA")


def debug(photo, quad, name):
    dbg = photo.convert("RGB").copy()
    ImageDraw.Draw(dbg).polygon(quad, outline=(255, 0, 255))
    dbg.resize((520, int(520 * dbg.height / dbg.width))).save(
        os.path.join(QA, f"quad-{name}.png")
    )


def do_sticker():
    photo = Image.open(os.path.join(IMAGES, "tp-sticker.png"))
    # Tight box: a wider one caught specular highlights on the lid and dragged
    # the top-left corner off the label.
    quad = expand(find_quad(photo, (278, 298, 528, 548), 170), 1.03)
    debug(photo, quad, "sticker")
    # Die-cut corners, so the artwork is rounded to match rather than sitting as
    # a hard square inside a rounded label.
    art = Image.new("RGBA", (600, 600), (0, 0, 0, 0))
    ImageDraw.Draw(art).rounded_rectangle(
        (0, 0, 599, 599), radius=46, fill=(220, 38, 38, 255)
    )
    sym = Image.open(
        os.path.join(OUT, "logo", "symbol", "symbol-white-1024.png")
    ).resize((372, 372), Image.LANCZOS)
    art.alpha_composite(sym, (114, 114))
    # Slightly under full opacity so the sticker keeps the photo's paper grain.
    out = paste_quad(photo, art, quad, opacity=0.96)
    out.convert("RGB").save(os.path.join(IMAGES, "tp-sticker-branded.png"))
    return quad


def do_phone():
    photo = Image.open(os.path.join(IMAGES, "tp-phone.png"))
    quad = find_quad(photo, (750, 210, 1080, 800), 205)
    debug(photo, quad, "phone")
    w, h = 440, 900
    sym = f"file://{OUT}/logo/symbol/symbol-black-256.png"
    html = f"""<body style="background:{CLOUD};padding:34px 26px">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <img src="{sym}" style="width:26px;height:26px">
    <div style="width:22px;height:2px;background:{INK};box-shadow:0 7px 0 {INK},0 14px 0 {INK}"></div>
  </div>
  <div style="font-family:'Fira Mono',monospace;font-size:11px;letter-spacing:.18em;
    color:{MUTED};margin-top:44px">FIRST VERSION</div>
  <div style="font-weight:800;font-size:38px;letter-spacing:-0.05em;line-height:0.96;
    margin-top:12px;color:{INK}">What to build first.</div>
  <div style="margin-top:26px">
    <div style="padding:14px 0;border-top:1px solid {LINE};font-size:15px;font-weight:700;
      letter-spacing:-0.02em;color:{INK}">Market context</div>
    <div style="padding:14px 0;border-top:1px solid {LINE};font-size:15px;font-weight:700;
      letter-spacing:-0.02em;color:{INK}">First-version scope</div>
    <div style="padding:14px 0;border-top:1px solid {LINE};font-size:15px;font-weight:700;
      letter-spacing:-0.02em;color:{INK}">Mockups</div>
    <div style="padding:14px 0;border-top:1px solid {LINE};border-bottom:1px solid {LINE};
      font-size:15px;font-weight:700;letter-spacing:-0.02em;color:{INK}">Technical direction</div>
  </div>
  <div style="background:{RED};color:#fff;font-size:16px;font-weight:700;text-align:center;
    padding:16px;border-radius:6px;margin-top:32px">Start with your idea</div>
</body>"""
    art = render_html(html, (w, h), os.path.join(OUT, "render", "_phone.png"))
    out = paste_quad(photo, art, quad)
    out.convert("RGB").save(os.path.join(IMAGES, "tp-phone-branded.png"))
    return quad


def do_tote():
    photo = Image.open(os.path.join(IMAGES, "tp-tote.png"))
    # Hand-measured front panel: a beige bag on a beige wall defeats thresholding.
    sx = photo.width / 520.0
    panel = [(163, 168), (362, 168), (362, 346), (163, 346)]
    panel = [(x * sx, y * sx) for x, y in panel]
    px0, py0 = panel[0]
    px1, py1 = panel[2]
    pw, ph = px1 - px0, py1 - py0
    # Print area: 42% of panel width, optically centred (slightly above middle).
    aw = pw * 0.42
    lock = Image.open(
        os.path.join(OUT, "logo", "lockup", "stacked", "lockup-s-black.png")
    )
    ah = aw * lock.height / lock.width
    cx, cy = px0 + pw / 2, py0 + ph * 0.46
    quad = (
        (cx - aw / 2, cy - ah / 2), (cx + aw / 2, cy - ah / 2),
        (cx + aw / 2, cy + ah / 2), (cx - aw / 2, cy + ah / 2),
    )
    debug(photo, quad, "tote")
    # Screen print sits in the weave rather than on top of it.
    out = paste_quad(photo, lock.convert("RGBA"), quad, opacity=0.90)
    out.convert("RGB").save(os.path.join(IMAGES, "tp-tote-branded.png"))
    return quad


def main():
    for fn in (do_sticker, do_phone, do_tote):
        quad = fn()
        pts = " ".join(f"({x:.0f},{y:.0f})" for x, y in quad)
        print(f"  {fn.__name__[3:]:8s} {pts}")


if __name__ == "__main__":
    main()
