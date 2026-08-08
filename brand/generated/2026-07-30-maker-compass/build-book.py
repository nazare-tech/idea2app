#!/usr/bin/env python3
"""Render brand-guidelines.pdf: 15 pages at 1200x850, plus per-page QA previews.

15 pages, not 14 or 16: Maker Compass is a digital product so the Icons page is
in, and its imagery is photography-only so Imagery Rules stays a single page.

Every generated photograph appears exactly once across the deck. Photos are
pre-baked to slot-sized JPEGs and never carry a CSS filter, which would force
Chromium to embed a lossless full-resolution bitmap.
"""
import os
import subprocess

from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RENDER = os.path.join(OUT, "render", "book")
QA = os.path.join(OUT, "qa", "book")
W, H = 1200, 850

RED, INK, INK2, MUTED = "#DC2626", "#1C1917", "#4A4040", "#8A8480"
CLOUD, PAPER, LINE = "#FAFAFA", "#F5F0EB", "#EAE0D8"

# Each source image is used on exactly one page.
SLOTS = {
    "cover": ("hero.png", (1200, 520), 0.55),
    "imagery": ("imagery-example.png", (520, 436), 0.42),
    "world-a": ("world-01.png", (600, 425), 0.5),
    "world-b": ("world-02.png", (600, 425), 0.45),
    "world-c": ("world-03.png", (600, 425), 0.5),
    "world-d": ("touchpoint-02.png", (600, 425), 0.5),
    "tp-laptop": ("touchpoint-01.png", (536, 330), 0.30),
    "tp-phone": ("tp-phone-branded.png", (536, 330), 0.5),
    "tp-sticker": ("tp-sticker-branded.png", (536, 330), 0.5),
    "tp-tote": ("tp-tote-branded.png", (536, 330), 0.5),
}


def prep_images():
    made = {}
    for slot, (src, (tw, th), focus) in SLOTS.items():
        src_path = os.path.join(OUT, "images", src)
        if not os.path.exists(src_path):
            raise SystemExit(f"missing source image: {src_path}")
        im = Image.open(src_path).convert("RGB")
        target, actual = tw / th, im.width / im.height
        if actual > target:
            new_w = int(im.height * target)
            left = (im.width - new_w) // 2
            im = im.crop((left, 0, left + new_w, im.height))
        else:
            new_h = int(im.width / target)
            top = int((im.height - new_h) * focus)
            im = im.crop((0, top, im.width, top + new_h))
        im = im.resize((tw * 2, th * 2), Image.LANCZOS)
        dest = os.path.join(RENDER, f"{slot}.jpg")
        for q in (82, 74, 66, 58, 50):
            im.save(dest, "JPEG", quality=q, optimize=True, progressive=True)
            if os.path.getsize(dest) <= 180_000:
                break
        made[slot] = dest
    return made


def icon(name, size=26, color=INK):
    with open(os.path.join(OUT, "icons", f"{name}.svg")) as fh:
        svg = fh.read()
    return svg.replace(
        'width="24" height="24"', f'width="{size}" height="{size}"'
    ).replace('stroke="currentColor"', f'stroke="{color}"')


def head():
    fonts = os.path.join(OUT, "fonts")
    display = ('"Hanken Grotesk", "Noto Sans SC", "Noto Sans JP", '
               '"Noto Sans Arabic", system-ui, sans-serif')
    mono = '"Fira Mono", "Noto Sans Mono", ui-monospace, monospace'
    return f"""<meta charset="utf-8">
<style>
@font-face {{ font-family:"Hanken Grotesk"; src:url("file://{fonts}/HankenGrotesk[wght].ttf") format("truetype-variations"); font-weight:100 900; }}
@font-face {{ font-family:"Fira Mono"; src:url("file://{fonts}/FiraMono-Medium.ttf") format("truetype"); font-weight:500; }}
@page {{ size:{W}px {H}px; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html,body {{ width:{W}px; height:{H}px; }}
body {{ font-family:{display}; background:{CLOUD}; color:{INK};
  -webkit-font-smoothing:antialiased; overflow:hidden; }}
.page {{ width:{W}px; height:{H}px; position:relative; overflow:hidden; background:{CLOUD}; }}
.pad {{ padding:52px 64px 0; }}
.kicker {{ font-family:{mono}; font-weight:500; font-size:11px; letter-spacing:0.18em;
  text-transform:uppercase; color:{MUTED}; }}
.kicker.red {{ color:{RED}; }}
.kicker.on-dark {{ color:#B9B2AC; }}
h2 {{ font-weight:800; letter-spacing:-0.05em; line-height:0.98; font-size:36px; margin-top:12px; }}
h3 {{ font-weight:700; letter-spacing:-0.02em; font-size:17px; }}
p {{ line-height:1.55; font-size:14px; color:{INK2}; }}
.small {{ font-size:12px; line-height:1.5; color:{INK2}; }}
.tiny {{ font-size:11px; line-height:1.45; color:{MUTED}; }}
.rule {{ height:1px; background:{LINE}; }}
.pageno {{ position:absolute; bottom:26px; right:34px; font-family:{mono};
  font-size:10px; letter-spacing:0.18em; color:{MUTED}; }}
.chip {{ position:absolute; background:rgba(28,25,23,0.78); color:#F0EBE5;
  padding:5px 9px; font-family:{mono}; font-weight:500; font-size:10px;
  letter-spacing:0.18em; text-transform:uppercase; }}
.x {{ color:#C0392B; font-weight:700; }}
img {{ display:block; }}
</style>"""


def shell(body, n, dark=False):
    color = "#B9B2AC" if dark else MUTED
    return (f'<div class="page"{" style=background:#1C1917" if dark else ""}>{body}'
            f'<div class="pageno" style="color:{color}">{n:02d} / 15</div></div>')


def band(kicker, cells, ground=PAPER, fg=INK, height=214, weights=None):
    """Full-bleed strip anchored to the trim.

    Without it every content page ran out around 500px and left a third of the
    sheet empty, which reads as assembled rather than designed. The strip carries
    material the guidelines owe anyway: the clear-space rule, never-do colour
    pairs, type on colour.
    """
    kick_color = "#F0A0A0" if ground == INK else MUTED
    weights = weights or [1] * len(cells)
    body = "".join(
        f'<div style="flex:{w}">{c}</div>' for c, w in zip(cells, weights)
    )
    return (f'<div style="position:absolute;bottom:0;left:0;width:{W}px;height:{height}px;'
            f'background:{ground};color:{fg};padding:22px 108px 0 64px;'
            f'{"border-top:1px solid " + LINE + ";" if ground != INK else ""}">'
            f'<div class="kicker" style="color:{kick_color}">{kicker}</div>'
            f'<div style="display:flex;gap:38px;margin-top:14px">{body}</div></div>')


def bcell(title, text, fg=INK, sub=MUTED):
    return (f'<div style="font-size:13.5px;font-weight:700;letter-spacing:-0.02em;color:{fg}">'
            f'{title}</div>'
            f'<div style="font-size:11.5px;line-height:1.5;margin-top:6px;color:{sub}">{text}</div>')


# ---------------------------------------------------------------- pages

def p01_cover(a):
    return f"""<div class="page">
  <img src="file://{a['cover']}" style="width:{W}px;height:520px;object-fit:cover">
  <div style="position:absolute;top:0;left:0;width:{W}px;height:520px;
    background:linear-gradient(180deg,rgba(28,25,23,.58) 0%,rgba(28,25,23,.08) 46%,
      rgba(28,25,23,.24) 74%,rgba(28,25,23,.80) 100%)"></div>
  <div style="position:absolute;top:44px;left:64px;display:flex;align-items:center;gap:14px">
    <img src="file://{OUT}/logo/symbol/symbol-cream-256.png" style="width:28px;height:28px">
    <span class="kicker on-dark">Brand Guidelines &nbsp;/&nbsp; Edition One &nbsp;/&nbsp; 30 July 2026</span>
  </div>
  <div style="position:absolute;top:424px;left:64px">
    <img src="file://{OUT}/logo/wordmark/wordmark-cream.png" style="width:470px">
  </div>
  <div style="padding:60px 64px 0;display:grid;grid-template-columns:1fr 320px;gap:60px">
    <div>
      <div style="font-weight:800;font-size:56px;letter-spacing:-0.05em;line-height:0.95;max-width:15ch">
        Stop putting your life's work off.</div>
      <p style="margin-top:22px;font-size:16px;max-width:58ch">The step before the build. Give it
        the rough idea, get back the market context, the first version worth building, the scope
        to hold it to, and where to start.</p>
    </div>
    <div style="border-left:1px solid {LINE};padding-left:26px">
      <div class="kicker">Contents</div>
      <div class="small" style="margin-top:12px;column-count:1;line-height:1.85">
        Strategy &middot; Foundation &middot; Logo &middot; Colour &middot; Type &middot; Icons
        &middot; Voice &middot; Imagery &middot; Visual world &middot; Touchpoints &middot;
        Applications &middot; Digital &middot; Do &amp; don't</div>
    </div>
  </div>
  <div class="pageno">01 / 15</div>
</div>"""


def p02_strategy():
    refs = [
        ("Stripe", "Measured calm. Dense information without anxiety; documentation treated as a designed product."),
        ("Basecamp", "Opinionated restraint stated out loud, and a willingness to lose the customers who disagree."),
        ("Aesop", "Typographic discipline. Warm neutrals doing the work colour usually does."),
        ("Field Notes", "Paper as the honest medium of thinking. Utility that looks like utility."),
    ]
    rows = "".join(
        f'<div style="padding:13px 0;border-bottom:1px solid {LINE};display:grid;'
        f'grid-template-columns:130px 1fr;gap:20px">'
        f'<div style="font-weight:700;font-size:14px;letter-spacing:-0.02em">{n}</div>'
        f'<div class="small">{t}</div></div>'
        for n, t in refs
    )
    return shell(f"""<div class="pad">
    <div class="kicker">Strategy &amp; positioning</div>
    <h2>Judgment, not generation.</h2>
    <p style="margin-top:18px;font-size:17px;max-width:74ch;color:{INK}">Maker Compass is the step
      before the build: it turns a rough idea into the market context, product plan, first-version
      scope, mockups, and technical direction a serious builder needs before writing code.</p>
    <div class="rule" style="margin:26px 0 22px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 300px;gap:38px">
      <div>
        <div class="kicker red">Primary segment</div>
        <p class="small" style="margin-top:9px">Founders and indie builders carrying one specific
          idea they have not turned into a real first version. They can already generate code.
          What they cannot do is decide which version of the idea deserves the next three months.</p>
        <div class="kicker" style="margin-top:20px">Trigger</div>
        <p class="small" style="margin-top:9px">Starting feels messy. Tools, prompts, and feature
          possibilities have created motion without direction.</p>
      </div>
      <div>
        <div class="kicker">Secondary segments</div>
        <p class="small" style="margin-top:9px">Product-minded operators who need to pressure-test
          an idea before asking for headcount.</p>
        <p class="small" style="margin-top:10px">Technical consultants who scope other people's
          ideas and need the reasoning legible to a client.</p>
        <div class="kicker" style="margin-top:20px">The wedge</div>
        <p class="small" style="margin-top:9px">Everyone else competes on how fast software can be
          produced. We compete on whether it was worth producing.</p>
      </div>
      <div style="background:{PAPER};padding:22px">
        <div class="kicker red">Anchor persona</div>
        <h3 style="margin-top:10px">Priya, 31</h3>
        <p class="small" style="margin-top:9px">A senior engineer with a side project she has
          restarted four times. Each restart began with a different framework and ended in the
          same place: a repo with authentication, a settings page, and no answer to who it is for.</p>
        <p class="small" style="margin-top:10px">She does not need help writing code and finds
          "AI builds your app" pitches insulting. She wants to cut the idea down to something she
          can put in front of ten people in three weeks.</p>
      </div>
    </div>
    <div style="margin-top:26px">
      <div class="kicker">Reference brands &mdash; borrow this</div>
      <div style="margin-top:8px">{rows}</div>
    </div>
  </div>""", 2)


def p03_foundation():
    values = [
        ("Direction over momentum", "Random features create motion, not progress."),
        ("Judgment over generation", "Generation is cheap now. Deciding what to generate is not."),
        ("Respect the idea", "A messy idea is meaningful. It belongs to someone's life."),
        ("Show the work", "Name the actual output and the next decision. Never sell a feeling."),
        ("Earn the restraint", "Every word and pixel justifies itself, including ours."),
    ]
    items = "".join(
        f'<div style="padding:12px 0;border-bottom:1px solid {LINE}">'
        f'<div style="font-weight:700;font-size:14px;letter-spacing:-0.02em">'
        f'<span style="color:{RED};font-family:monospace;font-size:11px;margin-right:10px">'
        f'{i+1:02d}</span>{n}</div>'
        f'<div class="small" style="margin-top:5px;padding-left:32px">{t}</div></div>'
        for i, (n, t) in enumerate(values)
    )
    return shell(f"""<div class="pad">
    <div class="kicker">Brand foundation</div>
    <h2>Most abandoned projects were never bad ideas.</h2>
    <div style="display:grid;grid-template-columns:1fr 420px;gap:52px;margin-top:24px">
      <div>
        <div class="kicker red">Mission</div>
        <p style="margin-top:9px;font-size:16px;color:{INK};max-width:52ch">Help builders choose an
          intentional first version before spending weeks, or asking AI to build the wrong thing.</p>
        <div class="rule" style="margin:22px 0"></div>
        <div class="kicker">Why we exist</div>
        <p style="margin-top:10px;max-width:58ch">They were unscoped ones. Someone had a real
          problem in view, opened an editor, and started with the parts that were easy to start
          with: the login screen, the settings page, the framework decision. Months later the repo
          has everything except an answer to who it is for.</p>
        <p style="margin-top:12px;max-width:58ch">Generation got cheap. That did not make building
          easier, it made the wrong build faster. You can now produce a plausible application in a
          weekend without ever deciding what the application is for, and the tooling will
          cheerfully help you do it. The bottleneck moved from typing to thinking, and almost
          nothing moved with it.</p>
        <p style="margin-top:12px;max-width:58ch">Maker Compass is the step people skip. Not a
          finished product. A direction you can defend, before you spend your life on the wrong one.</p>
      </div>
      <div>
        <div class="kicker">Values</div>
        <div style="margin-top:8px">{items}</div>
      </div>
    </div>
  </div>""" + band("Messaging pillars", [
        bcell("The start is the hard part.",
              "Builders need a bridge from idea to a clear first build. That gap is the product."),
        bcell("Faster is not always clearer.",
              "Generation should follow product judgment, never replace it."),
        bcell("The first version should be intentional.",
              "The smallest serious proof that the idea deserves more time."),
        bcell("Direction beats momentum theater.",
              "Random features create motion. Motion is not progress."),
    ]), 3)


def p04_logo():
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Logo</div>
    <h2>A bearing, not a compass rose.</h2>
  </div>
  <div style="padding:26px 64px 0;display:grid;grid-template-columns:330px 1fr;gap:46px">
    <div style="background:{INK};height:300px;display:flex;align-items:center;justify-content:center">
      <img src="file://{OUT}/logo/symbol/symbol-red-1024.png" style="width:196px;height:196px">
    </div>
    <div>
      <p style="max-width:66ch">A single solid wedge, rotated 32&deg; off vertical, with a notch cut
        into its tail. The rotation is the whole idea: a direction already chosen rather than a
        centred needle still deciding. No circle, no cardinal points, no ornament.</p>
      <p class="small" style="margin-top:12px;max-width:66ch">The wordmark sets <b>MakerCompass</b>
        as one solid word, <b>Maker</b> at weight 800 against <b>Compass</b> at weight 500, tracking
        -0.045em. The weight break carries direction-then-subject hierarchy and survives being
        flattened to a single colour, which a two-tone wordmark would not. Glyphs are real
        outlines, so the files carry no font dependency.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:22px;
        border-top:1px solid {LINE}">
        <div style="padding:18px 24px 0 0">
          <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:270px">
          <div class="kicker" style="margin-top:14px">Horizontal &middot; 1.3 cap</div>
        </div>
        <div style="padding:18px 0 0 24px;border-left:1px solid {LINE}">
          <img src="file://{OUT}/logo/lockup/stacked/lockup-s-black.png" style="width:150px">
          <div class="kicker" style="margin-top:14px">Stacked &middot; 1.9 cap</div>
        </div>
      </div>
    </div>
  </div>
  <div style="display:flex;margin-top:30px">
    <div style="flex:1;background:{CLOUD};border-top:1px solid {LINE};padding:22px 24px 0 64px">
      <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:210px">
      <div class="kicker" style="margin-top:14px">On light</div>
    </div>
    <div style="flex:1;background:{INK};padding:22px 24px 0">
      <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-cream.png" style="width:210px">
      <div class="kicker on-dark" style="margin-top:14px">On dark</div>
    </div>
    <div style="flex:1;background:{RED};padding:22px 24px 0">
      <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-white.png" style="width:210px">
      <div class="kicker" style="margin-top:14px;color:rgba(255,255,255,.8)">On Action Red</div>
    </div>
    <div style="flex:1;background:{PAPER};border-top:1px solid {LINE};padding:22px 64px 0 24px">
      <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-red.png" style="width:210px">
      <div class="kicker" style="margin-top:14px">Red on warm paper</div>
    </div>
  </div>
  """ + band("Clear space &amp; minimum sizes", [
        f'<div style="display:flex;align-items:center;gap:20px">'
        f'<div style="padding:19px;border:1px dashed {MUTED};flex-shrink:0">'
        f'<img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:148px">'
        f'</div>'
        f'<div style="font-size:11.5px;line-height:1.5;color:{MUTED}">'
        f'The dashed field is one cap height on every side. Nothing enters it: '
        f'not type, not a rule, not a photo edge.</div></div>',
        bcell("Wordmark", "90px wide minimum on screen. Below that the weight break stops reading."),
        bcell("Symbol", "16px minimum, using the simplified silhouette export."),
        bcell("Horizontal lockup",
              "140px wide minimum. Below that, drop to the symbol alone rather than shrinking further."),
    ], weights=[2.6, 1, 1, 1.15]), 4)


def p05_dont():
    lock = f"file://{OUT}/logo/lockup/horizontal/lockup-h-black.png"
    def bad(label, style, extra=""):
        return (f'<div style="border:1px solid {LINE};background:#FFF;height:150px;'
                f'display:flex;align-items:center;justify-content:center;overflow:hidden;'
                f'position:relative">{extra}'
                f'<img src="{lock}" style="{style}"></div>'
                f'<div style="margin-top:9px;display:flex;gap:7px;align-items:flex-start">'
                f'<span class="x">&#10007;</span><span class="small">{label}</span></div>')
    busy = (f'<div style="position:absolute;inset:0;background:'
            f'repeating-linear-gradient(45deg,#8A8480 0 9px,#B5AEA8 9px 18px)"></div>')
    # The recolour cell hue-rotates the red lockup: filtering the black one
    # produced an on-brand lockup and demonstrated nothing.
    lock_red = f"{OUT}/logo/lockup/horizontal/lockup-h-red.png"
    sym = f"{OUT}/logo/symbol/symbol-black-256.png"
    wm = f"{OUT}/logo/wordmark/wordmark-black.png"
    # Hand-assembled at the wrong ratio and gap, which is what "by eye" produces.
    by_eye = (f'<div style="display:flex;align-items:center;gap:34px">'
              f'<img src="file://{sym}" style="width:56px;height:56px">'
              f'<img src="file://{wm}" style="width:150px"></div>')
    cells = "".join([
        f'<div>{bad("Never stretch or condense. The letterfit is the wordmark.", "width:260px;height:64px")}</div>',
        f'<div>{bad("Never rotate. 32&deg; is fixed geometry inside the symbol, not a suggestion.", "width:190px;transform:rotate(-11deg)")}</div>',
        f'<div>{bad("Never recolour outside the four sanctioned variants.", "width:190px;filter:hue-rotate(115deg) saturate(1.3)").replace(lock, "file://" + lock_red)}</div>',
        f'<div>{bad("Never add a drop shadow, glow, or outline.", "width:190px;filter:drop-shadow(4px 6px 5px rgba(0,0,0,.5))")}</div>',
        f'<div>{bad("Never place the mark on a busy field. Find a dark, quiet region.", "width:190px", busy)}</div>',
        # Wrapped: two bare siblings became separate grid items and pushed this
        # caption onto a phantom row behind the band.
        f'<div><div style="border:1px solid {LINE};background:#FFF;height:150px;display:flex;'
        f'align-items:center;justify-content:center">{by_eye}</div>'
        f'<div style="margin-top:9px;display:flex;gap:7px;align-items:flex-start">'
        f'<span class="x">&#10007;</span><span class="small">Never rebuild the lockup by eye. '
        f'The symbol is 1.3 cap and the gap is 0.5 cap; regenerate it.</span></div></div>',
    ])
    return shell(f"""<div class="pad">
    <div class="kicker">Logo don'ts</div>
    <h2>Six ways to break it.</h2>
    <p style="margin-top:14px;max-width:70ch">Each of these is a real failure seen in the wild, not
      a hypothetical. The lockup is generated; if a placement needs a variant that does not exist,
      the answer is to generate it, never to modify one by hand.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px 30px;margin-top:20px">
      {cells}
    </div>
  </div>""" + band("Instead", [
        bcell("Need a new colourway?",
              "Generate it. build-symbol.py and build-wordmark.py take a hex and emit every "
              "size and lockup at the locked measurements.",
              fg="#FFF", sub="rgba(255,255,255,.72)"),
        bcell("Need it smaller than 140px?",
              "Use the symbol alone. It is drawn to hold at 16px; the lockup is not.",
              fg="#FFF", sub="rgba(255,255,255,.72)"),
        bcell("Need it over a photograph?",
              "Use the white variant, on a dark quiet region, with a contrast scrim if the "
              "region is not reliably dark.",
              fg="#FFF", sub="rgba(255,255,255,.72)"),
    ], ground=INK, fg="#FFF"), 5)


def p06_color():
    cols = [
        ("Action Red", "#DC2626", "220 38 38", "0 83 83 14",
         "Commitment moments only. Buttons, the live progress line, active states. Max 10% of a screen.", True),
        ("Workshop Black", "#1C1917", "28 25 23", "0 11 18 89",
         "Body text, dark surfaces, reversed lockups. A warm-shifted black, never #000.", True),
        ("Slate Plum", "#4A4040", "74 64 64", "0 14 14 71",
         "Second-tier text. Also the focus-visible ring: focus is navigation, not commitment.", True),
        ("Warm Paper", "#F5F0EB", "245 240 235", "0 2 4 4",
         "Hovers, secondary surfaces, footer chrome. Warmer than Cloud so layers read.", False),
        ("Cloud", "#FAFAFA", "250 250 250", "0 0 0 2",
         "The global background. Tinted off-white: bright, never sterile.", False),
    ]
    cells = "".join(
        f'<div style="flex:1;background:{h};padding:24px 20px;display:flex;flex-direction:column;'
        f'justify-content:flex-end;height:348px;'
        f'{"border-left:1px solid " + LINE + ";" if h == "#FAFAFA" else ""}">'
        f'<div style="font-size:19px;font-weight:800;letter-spacing:-0.03em;'
        f'color:{"#FFF" if d else INK}">{n}</div>'
        f'<div style="font-family:monospace;font-size:11px;letter-spacing:.12em;margin-top:10px;'
        f'color:{"rgba(255,255,255,.85)" if d else MUTED};line-height:1.9">{h}<br>RGB {r}<br>CMYK {c}</div>'
        f'<div style="font-size:11px;line-height:1.5;margin-top:12px;'
        f'color:{"rgba(255,255,255,.72)" if d else INK2}">{note}</div></div>'
        for n, h, r, c, note, d in cols
    )
    aux = "".join(
        f'<div style="display:flex;align-items:center;gap:9px">'
        f'<div style="width:15px;height:15px;background:{h}"></div>'
        f'<span class="tiny" style="color:{INK2}">{n} <span style="font-family:monospace">{h}</span></span></div>'
        for n, h in [("Warm Coral", "#F4A261"), ("Warm Sand", "#E9C46A"),
                     ("Warm Ember", "#D95F3B"), ("Success", "#22C55E"),
                     ("Info", "#3B82F6"), ("Destructive", "#C0392B")]
    )
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Colour</div>
    <h2>One accent, earned by rarity.</h2>
  </div>
  <div style="display:flex;margin-top:24px">{cells}</div>
  <div class="pad" style="padding-top:22px;display:grid;grid-template-columns:1fr 1fr 300px;gap:38px">
    <div>
      <div class="kicker red">The one voice rule</div>
      <p class="small" style="margin-top:8px">Action Red covers at most 10% of any composition. Its
        rarity is the point. If two unrelated elements are red in one screen, one of them is wrong.
        Red never appears on errors or focus rings.</p>
    </div>
    <div>
      <div class="kicker">Contrast</div>
      <p class="small" style="margin-top:8px">Workshop Black on Cloud is 15.6:1. Action Red on Cloud
        is 4.8:1: passes AA for large type and fills, but set small text in Workshop Black, never in
        red. Pure #000 and pure #FFF are forbidden as page grounds.</p>
    </div>
    <div>
      <div class="kicker">Auxiliary &amp; status &mdash; product-internal only</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 14px;margin-top:10px">{aux}</div>
      <p class="tiny" style="margin-top:10px">Never in marketing, on the landing, or in the mark.</p>
    </div>
  </div>""" + band("Never-do combinations", [
        f'<div style="display:flex;align-items:center;justify-content:center;background:#F4A261;'
        f'height:54px"><span style="color:{RED};font-weight:800;font-size:16px;'
        f'letter-spacing:-0.03em">Red on Warm Coral</span></div>'
        f'<div style="font-size:11.5px;line-height:1.5;margin-top:7px;color:{MUTED}">'
        f'<span class="x">&#10007;</span> 1.4:1. Two saturated warms cancel each other out.</div>',
        f'<div style="display:flex;align-items:center;justify-content:center;background:#FFF;'
        f'height:54px;border:1px solid {LINE}"><span style="color:{RED};font-size:11px">'
        f'Small body copy set in Action Red</span></div>'
        f'<div style="font-size:11.5px;line-height:1.5;margin-top:7px;color:{MUTED}">'
        f'<span class="x">&#10007;</span> Fails AA below 18px. Set small text in Workshop Black.</div>',
        f'<div style="display:flex;height:54px"><div style="flex:1;background:#000"></div>'
        f'<div style="flex:1;background:#FFF"></div></div>'
        f'<div style="font-size:11.5px;line-height:1.5;margin-top:7px;color:{MUTED}">'
        f'<span class="x">&#10007;</span> Pure #000 on pure #FFF. Every neutral carries a warm tilt.</div>',
        f'<div style="display:flex;align-items:center;gap:7px;height:54px">'
        f'<div style="background:{RED};color:#fff;font-size:10.5px;font-weight:700;padding:8px 11px;'
        f'border-radius:3px">Start</div>'
        f'<div style="background:{RED};color:#fff;font-size:10.5px;font-weight:700;padding:8px 11px;'
        f'border-radius:3px">Skip</div>'
        f'<div style="background:{RED};color:#fff;font-size:10.5px;font-weight:700;padding:8px 11px;'
        f'border-radius:3px">Later</div></div>'
        f'<div style="font-size:11.5px;line-height:1.5;margin-top:7px;color:{MUTED}">'
        f'<span class="x">&#10007;</span> Three red asks in one view. Exactly one thing commits.</div>',
    ], height=200), 6)


def p07_type():
    rows = [
        ("Display", "800", "clamp(2.5rem, 6vw, 4.5rem)", "0.95", "-0.05em", "Hero headlines. One per page."),
        ("Headline", "800", "clamp(2rem, 4vw, 3.35rem)", "0.98", "-0.05em", "Section headings, page titles."),
        ("Title", "700", "1.5rem", "1.2", "-0.02em", "Card titles, modal headings."),
        ("Body", "400", "1rem", "1.6", "normal", "Reading text. Cap at 65-75ch."),
        ("Label", "500", "0.6875rem", "1.2", "0.18em", "Fira Mono, uppercase. Metadata only."),
    ]
    table = "".join(
        f'<div style="display:grid;grid-template-columns:88px 52px 1fr 56px 74px 1.4fr;gap:14px;'
        f'padding:7px 0;border-bottom:1px solid {LINE};font-size:12px;align-items:baseline">'
        f'<div style="font-weight:700">{n}</div><div class="tiny">{w}</div>'
        f'<div style="font-family:monospace;font-size:10.5px;color:{INK2}">{s}</div>'
        f'<div class="tiny">{lh}</div><div class="tiny">{ls}</div>'
        f'<div class="tiny" style="color:{INK2}">{note}</div></div>'
        for n, w, s, lh, ls, note in rows
    )
    return shell(f"""<div class="pad">
    <div class="kicker">Typography</div>
    <h2>One family carries the whole hierarchy.</h2>
    <div style="display:grid;grid-template-columns:1fr 400px;gap:48px;margin-top:22px">
      <div>
        <div style="font-weight:800;font-size:60px;letter-spacing:-0.05em;line-height:0.92">
          Hanken Grotesk</div>
        <div style="font-weight:400;font-size:14px;line-height:1.55;margin-top:12px;color:{INK2};max-width:60ch">
          A single committed sans, from hero display at weight 800 down to body at 400. The range
          is wide enough to build hierarchy inside one family, which keeps the system from needing
          a second voice it has not earned.</div>
        <div style="font-family:'Fira Mono',monospace;font-weight:500;font-size:12.5px;
          letter-spacing:0.18em;margin-top:16px">FIRA MONO &mdash; THE METADATA VOICE</div>
        <div class="tiny" style="margin-top:7px;max-width:60ch">Kicker labels, status pills,
          navigation captions. Not Hanken small caps, not Hanken at a lighter weight.</div>
        <div style="margin-top:16px">{table}</div>
      </div>
      <div>
        <div class="kicker red">The tight tracking rule</div>
        <p class="small" style="margin-top:9px">Display and headline tracking is -0.05em, never flat
          zero. Large type at default tracking reads as a wireframe.</p>
        <div style="margin-top:16px;border:1px solid {LINE};background:#FFF;padding:18px">
          <div style="font-weight:800;font-size:30px;letter-spacing:-0.05em;line-height:1">
            Start with direction</div>
          <div class="tiny" style="margin-top:7px;color:{RED}">&#10003; -0.05em</div>
          <div style="font-weight:800;font-size:30px;letter-spacing:0;line-height:1;margin-top:16px;
            color:{MUTED}">Start with direction</div>
          <div class="tiny" style="margin-top:7px"><span class="x">&#10007;</span> flat zero</div>
        </div>
        <div style="margin-top:18px;background:{INK};padding:20px">
          <div style="color:#FFF;font-weight:800;font-size:26px;letter-spacing:-0.04em;line-height:1.05">
            Type on dark holds at weight 700 and up.</div>
          <div style="color:rgba(255,255,255,.7);font-size:12px;line-height:1.55;margin-top:10px">
            Below 700, warm-black grounds swallow the strokes. Never set body copy below 14px on
            a dark surface.</div>
        </div>
        <p class="tiny" style="margin-top:14px">Both families are OFL licensed. Stacks must carry
          Noto fallbacks so non-Latin strings never render as tofu.</p>
      </div>
    </div>
  </div>""" + band("Type on colour", [
        f'<div style="background:{RED};padding:14px 16px;height:74px">'
        f'<div style="color:#FFF;font-weight:800;font-size:19px;letter-spacing:-0.04em;'
        f'line-height:1.05">Start with direction</div>'
        f'<div style="color:rgba(255,255,255,.85);font-size:11px;margin-top:5px">'
        f'White only. Never Workshop Black on red.</div></div>',
        f'<div style="background:{INK};padding:14px 16px;height:74px">'
        f'<div style="color:#FFF;font-weight:800;font-size:19px;letter-spacing:-0.04em;'
        f'line-height:1.05">Start with direction</div>'
        f'<div style="color:rgba(255,255,255,.7);font-size:11px;margin-top:5px">'
        f'Weight 700 and up. Below that the ground swallows it.</div></div>',
        f'<div style="background:{PAPER};padding:14px 16px;height:74px;border:1px solid {LINE}">'
        f'<div style="color:{INK};font-weight:800;font-size:19px;letter-spacing:-0.04em;'
        f'line-height:1.05">Start with direction</div>'
        f'<div style="color:{INK2};font-size:11px;margin-top:5px">'
        f'Full hierarchy available. The default surface for long-form.</div></div>',
        bcell("Minimum sizes",
              "Body never below 14px on a dark ground, 13px on light. Labels never below "
              "11px, and never without the 0.18em tracking that makes them legible."),
    ]), 7)


def p08_icons():
    names = ["arrow-right", "check", "close", "plus", "menu", "search",
             "user", "settings", "bell", "info", "scope", "build-map"]
    cells = "".join(
        f'<div style="display:flex;flex-direction:column;align-items:center;gap:11px;'
        f'border:1px solid {LINE};background:#FFF;padding:20px 8px">{icon(n, 30)}'
        f'<span style="font-family:monospace;font-size:9.5px;letter-spacing:.1em;color:{MUTED}">{n}</span></div>'
        for n in names
    )
    scale = "".join(
        f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px">'
        f'{icon("build-map", s)}<span class="tiny">{s}px</span></div>'
        for s in (16, 20, 24, 32, 48)
    )
    return shell(f"""<div class="pad">
    <div class="kicker">Icons</div>
    <h2>Angular by default. Curves only where a form is genuinely round.</h2>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-top:24px">{cells}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 340px;gap:40px;margin-top:28px">
      <div>
        <div class="kicker red">Construction</div>
        <p class="small" style="margin-top:9px">24&times;24 viewBox. 1.5px stroke. Butt caps and
          miter joins for square-cut terminals. No fills. Geometry snapped to a 2px grid wherever
          the form allows.</p>
        <p class="small" style="margin-top:10px">Only the search lens and the info disc are round,
          because those forms genuinely are. Everything else stays angular so the set echoes the
          wedge instead of fighting it.</p>
      </div>
      <div>
        <div class="kicker">Colour</div>
        <p class="small" style="margin-top:9px">Icons are drawn with <span style="font-family:monospace">
          stroke="currentColor"</span> and inherit the surrounding text colour. They never carry
          Action Red: red is commitment, and an icon is navigation.</p>
        <div class="kicker" style="margin-top:18px">Beyond this set</div>
        <p class="small" style="margin-top:9px">Lucide matches the stroke weight and terminal style
          most closely. Re-cap any borrowed icon to butt terminals before use.</p>
      </div>
      <div>
        <div class="kicker">Scale &mdash; build-map</div>
        <div style="display:flex;align-items:flex-end;gap:22px;margin-top:14px;color:{INK}">{scale}</div>
        <p class="tiny" style="margin-top:14px">Every glyph is checked at 18px before it ships.
          Three icons were redrawn in this edition because their detail closed into a blob at that
          size: settings, bell, and build-map.</p>
      </div>
    </div>
  </div>""" + band("Drawing a new icon", [
        bcell("Start from an existing glyph",
              "Copy the nearest icon in the set and edit it. Starting from a blank grid is how "
              "stroke weights and terminal styles drift apart."),
        bcell("Snap to the 2px grid",
              "Coordinates land on even numbers or clean halves. Off-grid geometry renders "
              "soft at 16px and 24px."),
        bcell("Check it at 18px before shipping",
              "If two elements sit closer than 3px they will close into a blob. Respace them "
              "rather than thinning the stroke."),
        bcell("Never fill, never colour",
              "No solid shapes, no Action Red, no second weight. The set reads as one system "
              "because nothing in it is special."),
    ], height=200), 8)


def p09_voice():
    rows = [
        ("Headline", "Stop putting your life's work off."),
        ("Sub-headline", "Maker Compass turns a rough idea into the market context, first-version scope, mockups, and technical direction you need before you write code."),
        ("CTA button", "Start with your idea"),
        ("Secondary CTA", "See how it works"),
        ("Error state", "That idea description came through empty. Add a sentence or two about what it does and who it is for, then run it again."),
        ("Empty state", "No plans yet. Start with one idea, even a rough one."),
        ("Loading", "Reading the market around your idea."),
        ("Social post", "Generation is cheap now. Judgment is not. That gap is where most ideas quietly die."),
    ]
    table = "".join(
        f'<div style="display:grid;grid-template-columns:118px 1fr;gap:22px;padding:11px 0;'
        f'border-bottom:1px solid {LINE}">'
        f'<div class="kicker" style="padding-top:2px">{k}</div>'
        f'<div style="font-size:13px;line-height:1.5;color:{INK}">{v}</div></div>'
        for k, v in rows
    )
    return shell(f"""<div class="pad">
    <div class="kicker">Voice &amp; tone</div>
    <h2>Like a builder who has watched projects die in a repo.</h2>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:46px;margin-top:22px">
      <div>{table}</div>
      <div>
        <div class="kicker red">Adjectives</div>
        <p style="margin-top:9px;font-size:15px;color:{INK};font-weight:700;letter-spacing:-0.02em;line-height:1.4">
          Quietly direct. Anti-hype. Specific. Constructively critical.</p>
        <div class="rule" style="margin:18px 0"></div>
        <div class="kicker">Rules</div>
        <div class="small" style="margin-top:9px;line-height:1.75">
          Short sentences, plain verbs.<br>
          Say "first version" more than "MVP".<br>
          No em dashes: commas, colons, semicolons, periods, parentheses.<br>
          Lead with the next action.<br>
          Never promise instant startups or effortless success.</div>
        <div style="margin-top:20px;background:{PAPER};padding:18px">
          <div class="kicker" style="color:{RED}">Words we never use</div>
          <div class="small" style="margin-top:9px">unlock, supercharge, revolutionize, 10x,
            powered by AI, seamless, effortless, game-changing, elevate, curated, premium,
            cutting-edge, "in today's fast-paced world"</div>
        </div>
        <p class="tiny" style="margin-top:14px">A tagline test: if it could appear on any other
          tool's homepage without anyone noticing, it is not finished.</p>
      </div>
    </div>
  </div>""" + band("How the register shifts", [
        bcell("Marketing",
              "Makes a claim and defends it. Shortest sentences in the system. This is the only "
              "place the brand argues with the category."),
        bcell("Product",
              "Names the artifact and the next decision. No persuasion: the user already "
              "committed. Warm, factual, never chatty."),
        bcell("Errors and empty states",
              "Says what happened, then what to do. Two sentences maximum. Never blames the "
              "user, never apologises at length."),
        bcell("Long-form output",
              "PRDs, competitive reads, tech specs. Same craft as the marketing copy: in this "
              "product the artifact is the deliverable."),
    ], height=200), 9)


def p10_imagery(a):
    rules = [
        ("Subject", "Evidence of thinking in progress: paper with hand-drawn wireframes, index cards in columns, pinned cards, kraft folders. Closed laptops as often as open ones."),
        ("Light", "Real light only. Window light, overcast daylight, low late-afternoon rake. Never studio strobes."),
        ("Colour", "Warm neutrals, with exactly one red object in frame and nothing else red."),
        ("Cast", "Diverse across any set. Name a specific ethnicity per prompt; the model default skews white. Vary body types and ages, not only skin tone."),
        ("Texture", "Film grain always. Rooms that have been used. Slight imperfections."),
        ("Screens", "Grey placeholder rectangles and at most one red rectangle. No readable interface text; brand text is composited later so it stays editable."),
    ]
    items = "".join(
        f'<div style="padding:8px 0;border-bottom:1px solid {LINE};display:grid;'
        f'grid-template-columns:80px 1fr;gap:18px">'
        f'<div class="kicker" style="padding-top:2px">{k}</div>'
        f'<div class="small">{v}</div></div>'
        for k, v in rules
    )
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Imagery rules &mdash; photography</div>
    <h2>Found, not staged.</h2>
  </div>
  <div style="padding:22px 64px 0;display:grid;grid-template-columns:520px 1fr;gap:44px">
    <div>
      <img src="file://{a['imagery']}" style="width:520px;height:436px;object-fit:cover">
      <div class="kicker" style="margin-top:10px">Exemplary frame &mdash; real light, real room, quiet composition</div>
    </div>
    <div>
      {items}
      <div style="margin-top:16px;background:{INK};padding:18px">
        <div class="kicker" style="color:#F0A0A0">Never in the prompt</div>
        <div style="color:rgba(255,255,255,.78);font-size:11.5px;line-height:1.55;margin-top:8px">
          studio strobes, softbox, "professional", "premium", modern office, coworking space,
          glass partitions, "startup vibes", neon, holograms, clean white background, lens flare</div>
        <div class="kicker" style="color:#F0A0A0;margin-top:14px">Banned clich&eacute; concepts</div>
        <div style="color:rgba(255,255,255,.78);font-size:11.5px;line-height:1.55;margin-top:8px">
          lightbulbs, hourglasses, handshakes, network nodes, glowing brains, rockets, mazes,
          puzzle pieces, humanoid AI figures, a literal compass held up to the lens</div>
      </div>
      <p class="tiny" style="margin-top:10px">Never name a real publication or person: it is the
        fastest route to baked-in text and a moderation refusal.</p>
    </div>
  </div>""" + band("Compositing over generation", [
        bcell("Generate the surface blank",
              "Ask for an empty screen, sticker, or panel. Naming a logo in the prompt returns "
              "garbled pseudo-text and wrong-weight letterforms every time."),
        bcell("Composite the artwork after",
              "Perspective-map the real asset onto the surface. build-composites.py detects the "
              "quad and warps the artwork onto it."),
        bcell("Why it matters",
              "The mark stays correctly typeset, the copy stays editable, and the shot can be "
              "regenerated when the wordmark or palette changes."),
    ], height=176), 10)


def p11_world(a):
    def cell(slot, label, edge):
        return (f'<div style="position:relative">'
                f'<img src="file://{a[slot]}" style="width:600px;height:425px;object-fit:cover">'
                f'<div class="chip" style="{edge}:16px;left:16px">{label}</div></div>')
    return f"""<div class="page" style="background:{INK}">
  <div style="display:grid;grid-template-columns:600px 600px;grid-template-rows:425px 425px">
    {cell('world-a', 'Sorting scope', 'top')}
    {cell('world-b', 'One card moved', 'top')}
    {cell('world-c', 'Laptop closed', 'bottom')}
    {cell('world-d', 'Committed to paper', 'bottom')}
  </div>
  <div style="position:absolute;top:0;left:0;width:{W}px;height:{H}px;display:flex;
    align-items:center;justify-content:center;pointer-events:none">
    <div style="background:{CLOUD};padding:26px 34px;max-width:430px">
      <div class="kicker red">Visual world</div>
      <h3 style="margin-top:10px;font-size:22px;letter-spacing:-0.04em;line-height:1.1">
        A lit workshop, not a dark command center.</h3>
      <p class="small" style="margin-top:10px">Real light only. Warm neutrals with exactly one red
        object in frame. Film grain always. Subjects work, they do not address the camera. Cast is
        diverse by default, named per prompt.</p>
      <p class="tiny" style="margin-top:10px">Deliberately pre-digital: the thinking happens before
        the tooling.</p>
      <div class="kicker" style="margin-top:16px;text-align:right">11 / 15</div>
    </div>
  </div>
</div>"""


def p12_touchpoints(a):
    def cell(slot, label, note):
        # 286px, not 330: at 330 the lower row cleared the page trim and took its
        # captions with it.
        return (f'<div><div style="position:relative">'
                f'<img src="file://{a[slot]}" style="width:536px;height:286px;object-fit:cover">'
                f'<div class="chip" style="top:14px;left:14px">{label}</div></div>'
                f'<div class="tiny" style="margin-top:8px">{note}</div></div>')
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Touchpoints</div>
    <h2>Where the identity meets the physical world.</h2>
  </div>
  <div style="padding:18px 64px 0;display:grid;grid-template-columns:536px 536px;gap:18px 40px">
    {cell('tp-laptop', 'Product in context', 'Screens show real output, never invented UI.')}
    {cell('tp-phone', 'Phone in hand', 'Symbol alone in the mobile nav, never the full lockup.')}
    {cell('tp-sticker', 'Laptop sticker', 'White symbol on Action Red. Die-cut square, 50mm.')}
    {cell('tp-tote', 'Canvas tote', 'Stacked lockup, single-colour screen print, 180mm wide.')}
  </div>""", 12)


def p13_applications():
    lock_h = f"file://{OUT}/logo/lockup/horizontal/lockup-h-black.png"
    lock_s = f"file://{OUT}/logo/lockup/stacked/lockup-s-cream.png"
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Brand applications</div>
    <h2>Specs for the secondary set.</h2>
  </div>
  <div style="padding:22px 64px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px">
    <div>
      <div style="width:330px;height:190px;background:{PAPER};border:1px solid {LINE};
        padding:22px;display:flex;flex-direction:column;justify-content:space-between">
        <img src="{lock_h}" style="width:150px">
        <div>
          <div style="font-size:13px;font-weight:700;letter-spacing:-0.02em">Priya Raman</div>
          <div class="tiny" style="margin-top:2px">Founder</div>
          <div style="font-family:monospace;font-size:9.5px;letter-spacing:.1em;color:{MUTED};
            margin-top:8px">MAKERCOMPASS.COM</div>
        </div>
      </div>
      <div class="kicker" style="margin-top:11px">Business card &middot; 85 &times; 55mm</div>
      <div class="tiny" style="margin-top:6px">Uncoated warm stock, 400gsm. Lockup at 34mm wide,
        one cap height from the trim.</div>
    </div>
    <div>
      <div style="display:flex;align-items:flex-end;gap:20px">
        <div>
          <div style="width:104px;height:104px;border-radius:50%;background:{RED};
            display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img src="file://{OUT}/logo/symbol/symbol-white-256.png" style="width:56px;height:56px">
          </div>
          <div class="kicker" style="margin-top:10px;font-size:9.5px">Avatar</div>
        </div>
        <div>
          <div style="width:104px;height:104px;border-radius:22px;background:{INK};
            display:flex;align-items:center;justify-content:center">
            <img src="file://{OUT}/logo/symbol/symbol-red-256.png" style="width:58px;height:58px">
          </div>
          <div class="kicker" style="margin-top:10px;font-size:9.5px">App icon</div>
        </div>
      </div>
      <div class="tiny" style="margin-top:8px">Symbol only, never the wordmark. Ship the asset with
        sharp corners; the platform applies its own rounding.</div>
      <div style="margin-top:20px;border-top:1px solid {LINE};padding-top:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="file://{OUT}/logo/symbol/symbol-black-256.png" style="width:26px;height:26px">
          <div>
            <div style="font-size:12px;font-weight:700;letter-spacing:-0.02em">Priya Raman</div>
            <div class="tiny" style="font-size:10px">Founder, Maker Compass</div>
          </div>
        </div>
        <div class="kicker" style="margin-top:11px;font-size:9.5px">Email signature</div>
        <div class="tiny" style="margin-top:5px">Symbol at 26px, no image-heavy banner, no quote.</div>
      </div>
    </div>
    <div>
      <div style="width:330px;height:190px;background:{INK};padding:24px;display:flex;
        flex-direction:column;justify-content:space-between">
        <img src="{lock_s}" style="width:96px">
        <div>
          <div style="color:#FFF;font-weight:800;font-size:22px;letter-spacing:-0.04em;line-height:1.05">
            Direction first.<br>Then build.</div>
          <div style="font-family:monospace;font-size:9px;letter-spacing:.18em;
            color:rgba(255,255,255,.55);margin-top:10px">Q3 REVIEW &middot; 2026</div>
        </div>
      </div>
      <div class="kicker" style="margin-top:11px">Presentation cover &middot; 16:9</div>
      <div class="tiny" style="margin-top:6px">Workshop Black ground, stacked lockup top-left, one
        idea per slide. Never a gradient, never a stock photo behind the title.</div>
    </div>
  </div>
  <div style="padding:20px 64px 0;display:grid;grid-template-columns:1fr 1fr;gap:36px">
    <div>
      <div style="border:1px solid {LINE};background:{CLOUD};height:164px;display:flex">
        <div style="width:58px;background:{INK};padding:14px 0;display:flex;flex-direction:column;
          align-items:center;gap:18px">
          <img src="file://{OUT}/logo/symbol/symbol-cream-256.png" style="width:20px;height:20px">
          <div style="width:20px;height:1.5px;background:rgba(255,255,255,.35);
            box-shadow:0 9px 0 rgba(255,255,255,.35),0 18px 0 rgba(255,255,255,.35)"></div>
        </div>
        <div style="flex:1;padding:16px 18px">
          <div class="kicker" style="font-size:9.5px">Workspace</div>
          <div style="font-weight:700;font-size:17px;letter-spacing:-0.02em;margin-top:7px">
            Priya's reading app</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <div style="background:{RED};color:#fff;font-size:10px;font-weight:700;
              padding:6px 11px;border-radius:4px">Scope it</div>
            <div style="border:1px solid {LINE};background:#FFF;font-size:10px;font-weight:700;
              padding:6px 11px;border-radius:4px;color:{INK2}">Open plan</div>
          </div>
        </div>
      </div>
      <div class="kicker" style="margin-top:11px">Product chrome &middot; navigation rail</div>
      <div class="tiny" style="margin-top:6px">Symbol alone on Workshop Black, never the lockup.
        8px rounding inside the product, sharp corners on landing surfaces.</div>
    </div>
    <div>
      <div style="background:{INK};height:164px;padding:20px 24px;display:flex;
        flex-direction:column;justify-content:space-between">
        <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-cream.png" style="width:132px">
        <div>
          <div style="color:#FFF;font-weight:800;font-size:26px;letter-spacing:-0.045em;
            line-height:1.02;max-width:22ch">Generation is cheap now. Judgment is not.</div>
          <div style="width:38px;height:2px;background:{RED};margin-top:12px"></div>
        </div>
      </div>
      <div class="kicker" style="margin-top:11px">Social share card &middot; 1200 &times; 630</div>
      <div class="tiny" style="margin-top:6px">One claim, one red rule, lockup top-left. No
        photography behind the type; the claim has to carry it alone.</div>
    </div>
  </div>
  """ + band("Production specs", [
        bcell("Favicon", "32px and 16px exports of the simplified silhouette. Never scale a "
              "large PNG down; the notch turns to mud."),
        bcell("Sticker", "50mm die-cut square, white symbol on Action Red, matte laminate, "
              "1.5mm white keyline."),
        bcell("Tote", "Stacked lockup, single-colour screen print in Workshop Black, 180mm "
              "wide, centred on the front panel."),
        bcell("Print colour", "No Pantone matched yet. Get Action Red matched physically "
              "against uncoated stock before any run."),
    ], height=176), 13)


def p14_digital():
    tiles = [
        (RED, "#FFF", "Generation is cheap now.", "quote"),
        (INK, "#FFF", "", "symbol"),
        (PAPER, INK, "The start is the hard part.", "quote"),
        (INK, "#FFF", "Judgment is not.", "quote"),
        (PAPER, INK, "", "wordmark"),
        (RED, "#FFF", "Direction beats momentum theater.", "quote"),
        (PAPER, INK, "First version, not MVP.", "quote"),
        (RED, "#FFF", "", "symbol-white"),
        (INK, "#FFF", "Random features create motion, not progress.", "quote"),
    ]
    def tile(bg, fg, text, kind):
        if kind == "symbol":
            inner = f'<img src="file://{OUT}/logo/symbol/symbol-red-256.png" style="width:34px;height:34px">'
        elif kind == "symbol-white":
            inner = f'<img src="file://{OUT}/logo/symbol/symbol-white-256.png" style="width:34px;height:34px">'
        elif kind == "wordmark":
            inner = f'<img src="file://{OUT}/logo/wordmark/wordmark-black.png" style="width:92px">'
        else:
            inner = (f'<div style="color:{fg};font-weight:800;font-size:13px;letter-spacing:-0.03em;'
                     f'line-height:1.15">{text}</div>')
        return (f'<div style="width:104px;height:104px;background:{bg};padding:13px;display:flex;'
                f'align-items:center;justify-content:center;text-align:center">{inner}</div>')
    grid = "".join(tile(*t) for t in tiles)
    return shell(f"""<div class="pad" style="padding-bottom:0">
    <div class="kicker">Digital &amp; social</div>
    <h2>The grid is typographic, not photographic.</h2>
  </div>
  <div style="padding:22px 64px 0;display:grid;grid-template-columns:1fr 348px 240px;gap:38px">
    <div>
      <div style="border:1px solid {LINE};background:{CLOUD}">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
          border-bottom:1px solid {LINE};background:#FFF">
          <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:132px">
          <div style="display:flex;align-items:center;gap:14px">
            <span class="kicker" style="font-size:9px">How it works</span>
            <span style="background:{RED};color:#fff;font-size:10.5px;font-weight:700;
              padding:6px 12px;border-radius:3px">Start with your idea</span>
          </div>
        </div>
        <div style="padding:26px 16px 24px">
          <div class="kicker">Before you build</div>
          <div style="font-weight:800;font-size:30px;letter-spacing:-0.05em;line-height:0.96;
            margin-top:9px;max-width:16ch">Stop putting your life's work off.</div>
          <div class="small" style="margin-top:11px;max-width:44ch">Give it the rough idea. Get back
            the market context, the first version worth building, and where to start.</div>
        </div>
      </div>
      <div class="kicker" style="margin-top:10px">Website hero</div>
      <div class="tiny" style="margin-top:6px">Sharp corners on landing surfaces, 8px rounding inside
        the product. Red on exactly one element. Tinted-white ground, never flat #FFF. Entrance
        motion uses cubic-bezier(0.16, 1, 0.3, 1) with no bounce.</div>
    </div>
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,104px);gap:6px">{grid}</div>
      <div class="kicker" style="margin-top:11px">Instagram grid</div>
      <div class="tiny" style="margin-top:6px">Type and colour carry the feed. Photography appears
        at most once per row, never as a filler tile. Captions run in the same voice as the product:
        one claim, no hashtags, no emoji.</div>
    </div>
    <div>
      <div style="width:150px;height:266px;background:{INK};padding:16px;display:flex;
        flex-direction:column;justify-content:space-between">
        <img src="file://{OUT}/logo/symbol/symbol-cream-256.png" style="width:22px;height:22px">
        <div>
          <div style="color:#FFF;font-weight:800;font-size:17px;letter-spacing:-0.04em;line-height:1.1">
            The start is the hard part.</div>
          <div style="width:34px;height:2px;background:{RED};margin-top:12px"></div>
        </div>
        <div style="font-family:monospace;font-size:8px;letter-spacing:.18em;
          color:rgba(255,255,255,.5)">MAKERCOMPASS.COM</div>
      </div>
      <div class="kicker" style="margin-top:11px">Story template</div>
      <div class="tiny" style="margin-top:6px">Symbol top-left, claim bottom-left, one red rule.
        Safe margin 16px. Link-in-bio uses the same ground with stacked text rows and no icons.</div>
    </div>
  </div>""" + band("Channel rules", [
        bcell("One claim per post",
              "No threads unless asked. No hashtags, no emoji, no rocket. If the post needs a "
              "hook to work, the claim is not strong enough."),
        bcell("Photography is rationed",
              "At most one photo per grid row. A photo used as a filler tile is the fastest way "
              "to look like every other tool."),
        bcell("Red marks the ask",
              "Exactly one red element per composition, and it is always the thing you want "
              "clicked. Never a decorative red tile."),
        bcell("Motion",
              "cubic-bezier(0.16, 1, 0.3, 1), 550ms for entrances, 200ms for state. No bounce, "
              "no spring, no parallax."),
    ], height=200), 14)


def p15_dos():
    dos = [
        "Leave one full cap height of clear space around the lockup, including in social crops.",
        "Let one element dominate every composition. Flat hierarchy is the tell of an undesigned page.",
        "Name the artifact (\"your first-version scope\", \"the competitive read\"), not the feature.",
        "Use Fira Mono uppercase at 0.18em for every kicker and metadata line, and nothing else.",
        "Show the product's real output, including when it is long and unglamorous.",
    ]
    donts = [
        "Don't put Action Red on more than 10% of a screen, or on two unrelated elements at once.",
        "Don't use red for errors or focus rings. Errors are #C0392B; focus rings are #4A4040.",
        "Don't set display type at flat tracking. -0.05em, or it reads as a wireframe.",
        "Don't imply the product writes the app for you. It decides what the app should be.",
        "Don't ship a gradient hero, a glass panel, a sparkle, or a \"Powered by AI\" badge.",
    ]
    def col(items, mark, color, kicker):
        rows = "".join(
            f'<div style="display:grid;grid-template-columns:26px 1fr;gap:10px;padding:13px 0;'
            f'border-bottom:1px solid {LINE}">'
            f'<span style="color:{color};font-weight:700;font-size:14px;line-height:1.5">{mark}</span>'
            f'<span style="font-size:13.5px;line-height:1.5;color:{INK2}">{t}</span></div>'
            for t in items
        )
        return f'<div><div class="kicker red">{kicker}</div><div style="margin-top:6px">{rows}</div></div>'
    return shell(f"""<div class="pad">
    <div class="kicker">Do &amp; don't</div>
    <h2>The five that actually get broken.</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:24px">
      {col(dos, "&#10003;", INK, "Do")}
      {col(donts, "&#10007;", "#C0392B", "Don't")}
    </div>
    <div style="margin-top:30px;background:{PAPER};padding:24px 26px;display:grid;
      grid-template-columns:1fr 300px;gap:40px">
      <div>
        <div class="kicker">The anti-generic test</div>
        <p class="small" style="margin-top:9px">Before anything ships, ask whether it could be the
          brand for literally anything else. If yes, it is not done. A strong brand is a specific
          product plus a clear audience model plus a point of view. The restraint in this document
          is not a taste preference: a tool that sells direction cannot ship a hype-styled
          interface, so the argument dies with any one of those don'ts.</p>
      </div>
      <div>
        <div class="kicker">Regenerating</div>
        <div class="tiny" style="margin-top:9px;line-height:1.7;font-family:monospace;font-size:10px">
          build-symbol.py<br>build-wordmark.py<br>build-icons.py<br>build-tokens.py<br>build-book.py</div>
        <div class="tiny" style="margin-top:9px">In that order. Tokens derive from DESIGN.json, so
          the kit cannot drift from what the product ships.</div>
      </div>
    </div>
  </div>""", 15)


def render(name, body):
    html_path = os.path.join(RENDER, f"{name}.html")
    with open(html_path, "w") as fh:
        fh.write(f"<!doctype html><html><head>{head()}</head><body>{body}</body></html>")
    png = os.path.join(QA, f"{name}.png")
    pdf = os.path.join(RENDER, f"{name}.pdf")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    f"--screenshot={png}", f"--window-size={W},{H}", html_path],
                   check=True, capture_output=True)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf}", html_path], check=True, capture_output=True)
    return pdf


def main():
    for d in (RENDER, QA):
        os.makedirs(d, exist_ok=True)
    a = prep_images()
    pages = [
        ("p01-cover", p01_cover(a)), ("p02-strategy", p02_strategy()),
        ("p03-foundation", p03_foundation()), ("p04-logo", p04_logo()),
        ("p05-logo-donts", p05_dont()), ("p06-color", p06_color()),
        ("p07-typography", p07_type()), ("p08-icons", p08_icons()),
        ("p09-voice", p09_voice()), ("p10-imagery", p10_imagery(a)),
        ("p11-world", p11_world(a)), ("p12-touchpoints", p12_touchpoints(a)),
        ("p13-applications", p13_applications()), ("p14-digital", p14_digital()),
        ("p15-dos", p15_dos()),
    ]
    pdfs = [render(n, b) for n, b in pages]
    final = os.path.join(OUT, "brand-guidelines.pdf")
    subprocess.run(["pdfunite", *pdfs, final], check=True)
    print(f"{len(pages)} pages -> brand-guidelines.pdf "
          f"({os.path.getsize(final)/1000:.0f}KB)")


if __name__ == "__main__":
    main()
