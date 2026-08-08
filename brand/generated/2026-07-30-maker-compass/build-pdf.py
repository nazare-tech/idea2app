#!/usr/bin/env python3
"""Render quick-brand.pdf: 4 pages at 1200x850, plus per-page QA previews.

Each page is its own HTML file so Chrome can both screenshot it (for visual QA)
and print it to PDF at exact page size, then pdfunite merges the pages. Photos
are pre-baked to slot-sized JPEGs; no CSS filter ever touches a photo, because
that forces Chromium to embed a lossless full-resolution bitmap and bloats the
PDF by orders of magnitude.
"""
import json
import os
import subprocess

from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RENDER = os.path.join(OUT, "render")
QA = os.path.join(OUT, "qa")
W, H = 1200, 850

# slot name -> (source image, target px, crop focus 0..1 vertical)
SLOTS = {
    "cover": ("hero.png", (1200, 430), 0.55),
    "world-a": ("world-01.png", (600, 426), 0.5),
    "world-b": ("world-02.png", (600, 426), 0.45),
    "world-c": ("world-03.png", (600, 426), 0.5),
    "world-d": ("touchpoint-02.png", (600, 426), 0.5),
    "app-shot": ("touchpoint-01.png", (560, 330), 0.30),
}


def prep_images():
    """Cover-crop to the slot aspect, then save a ~85-180KB JPEG."""
    made = {}
    for slot, (src, (tw, th), focus) in SLOTS.items():
        src_path = os.path.join(OUT, "images", src)
        if not os.path.exists(src_path):
            raise SystemExit(f"missing source image: {src_path}")
        im = Image.open(src_path).convert("RGB")
        target = tw / th
        actual = im.width / im.height
        if actual > target:
            new_w = int(im.height * target)
            left = (im.width - new_w) // 2
            im = im.crop((left, 0, left + new_w, im.height))
        else:
            new_h = int(im.width / target)
            top = int((im.height - new_h) * focus)
            im = im.crop((0, top, im.width, top + new_h))
        im = im.resize((tw * 2, th * 2), Image.LANCZOS)  # 2x for print crispness
        dest = os.path.join(RENDER, f"{slot}.jpg")
        for q in (82, 74, 66, 58, 50):
            im.save(dest, "JPEG", quality=q, optimize=True, progressive=True)
            if os.path.getsize(dest) <= 180_000:
                break
        made[slot] = (dest, os.path.getsize(dest))
    return made


def head():
    fonts = os.path.join(OUT, "fonts")
    display = (
        '"Hanken Grotesk", "Noto Sans SC", "Noto Sans JP", "Noto Sans Arabic", '
        "system-ui, sans-serif"
    )
    mono = '"Fira Mono", "Noto Sans Mono", ui-monospace, monospace'
    return f"""<meta charset="utf-8">
<style>
@font-face {{ font-family:"Hanken Grotesk"; src:url("file://{fonts}/HankenGrotesk[wght].ttf") format("truetype-variations"); font-weight:100 900; }}
@font-face {{ font-family:"Fira Mono"; src:url("file://{fonts}/FiraMono-Medium.ttf") format("truetype"); font-weight:500; }}
@font-face {{ font-family:"Fira Mono"; src:url("file://{fonts}/FiraMono-Regular.ttf") format("truetype"); font-weight:400; }}
@page {{ size:{W}px {H}px; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html,body {{ width:{W}px; height:{H}px; }}
body {{ font-family:{display}; background:#FAFAFA; color:#1C1917;
  -webkit-font-smoothing:antialiased; overflow:hidden; }}
.page {{ width:{W}px; height:{H}px; position:relative; overflow:hidden; background:#FAFAFA; }}
.kicker {{ font-family:{mono}; font-weight:500; font-size:11px; letter-spacing:0.18em;
  text-transform:uppercase; color:#8A8480; }}
.kicker.on-dark {{ color:#B9B2AC; }}
.kicker.red {{ color:#DC2626; }}
h1 {{ font-weight:800; letter-spacing:-0.05em; line-height:0.95; }}
h2 {{ font-weight:800; letter-spacing:-0.05em; line-height:0.98; font-size:34px; }}
h3 {{ font-weight:700; letter-spacing:-0.02em; font-size:17px; }}
p {{ line-height:1.55; font-size:14px; color:#4A4040; }}
.rule {{ height:1px; background:#EAE0D8; }}
.pageno {{ position:absolute; bottom:26px; right:34px; font-family:{mono};
  font-size:10px; letter-spacing:0.18em; color:#8A8480; }}
/* Over photography, captions get a solid chip rather than a text shadow.
   A shadow cannot be relied on when the underlying region is light paper. */
.chip {{ position:absolute; background:rgba(28,25,23,0.78); color:#F0EBE5;
  padding:5px 9px; font-family:{mono}; font-weight:500; font-size:10px;
  letter-spacing:0.18em; text-transform:uppercase; }}
img {{ display:block; }}
</style>"""


def page_cover(assets):
    return f"""<div class="page">
  <img src="file://{assets['cover'][0]}" style="width:{W}px;height:430px;object-fit:cover">
  <div style="position:absolute;top:0;left:0;width:{W}px;height:430px;
    background:linear-gradient(180deg, rgba(28,25,23,0.60) 0%, rgba(28,25,23,0.10) 48%,
      rgba(28,25,23,0.20) 72%, rgba(28,25,23,0.78) 100%)"></div>
  <div style="position:absolute;top:44px;left:64px;display:flex;align-items:center;gap:14px">
    <img src="file://{OUT}/logo/symbol/symbol-cream-256.png" style="width:30px;height:30px">
    <span class="kicker on-dark">Brand Guide &nbsp;/&nbsp; Quick Pass &nbsp;/&nbsp; 30 July 2026</span>
  </div>
  <div style="position:absolute;top:352px;left:64px;right:64px">
    <img src="file://{OUT}/logo/wordmark/wordmark-cream.png" style="width:430px">
  </div>
  <div style="padding:56px 64px 0;display:grid;grid-template-columns:1fr 300px;gap:56px">
    <div>
      <h1 style="font-size:52px;max-width:14ch">Stop putting your life's work off.</h1>
      <p style="margin-top:20px;font-size:16px;max-width:56ch">Maker Compass turns a rough software
        idea into the market context, product plan, first-version scope, mockups, technical
        direction, and build-ready next step a serious builder needs.</p>
      <div class="rule" style="margin:26px 0 20px"></div>
      <div style="display:flex;gap:44px">
        <div style="max-width:30ch">
          <div class="kicker">Positioning</div>
          <p style="margin-top:8px;font-size:13px">The step before the build. Judgment, not
            generation: AI made software easier to produce, not easier to make meaningful.</p>
        </div>
        <div style="max-width:30ch">
          <div class="kicker">Primary audience</div>
          <p style="margin-top:8px;font-size:13px">Founders and indie builders carrying one idea
            they have not turned into a real first version.</p>
        </div>
      </div>
    </div>
    <div style="border-left:1px solid #EAE0D8;padding-left:26px">
      <div class="kicker red">Anchor persona</div>
      <h3 style="margin-top:10px">Priya, 31</h3>
      <p style="margin-top:8px;font-size:13px">Senior engineer with a side project she has
        restarted four times. Every restart ends the same way: auth, a settings page, and no
        answer to who it is for. She does not need help writing code.</p>
      <div class="kicker" style="margin-top:24px">Secondary</div>
      <p style="margin-top:8px;font-size:13px">Operators pressure-testing an idea before asking
        for headcount. Consultants scoping other people's ideas.</p>
    </div>
  </div>
  <div class="pageno">01 / 04</div>
</div>"""


def page_identity():
    swatches = [
        ("Action Red", "#DC2626", "Commitment. Max 10% of a screen.", True),
        ("Workshop Black", "#1C1917", "Text, dark surfaces.", True),
        ("Slate Plum", "#4A4040", "Second-tier text, focus ring.", True),
        ("Warm Paper", "#F5F0EB", "Secondary surface, chrome.", False),
        ("Cloud", "#FAFAFA", "Page ground. Never pure white.", False),
    ]
    cells = "".join(
        f'<div style="flex:1;background:{hexv};padding:16px 14px;display:flex;'
        f'flex-direction:column;justify-content:flex-end;height:158px;'
        # Cloud is a hair off the page ground, so it needs a hairline to exist at all.
        f'{"border-left:1px solid #EAE0D8;" if hexv == "#FAFAFA" else ""}">'
        f'<div class="kicker" style="color:{"#FFFFFF" if dark else "#8A8480"};opacity:.85">{hexv}</div>'
        f'<div style="font-size:14px;font-weight:700;margin-top:6px;letter-spacing:-0.02em;'
        f'color:{"#FFFFFF" if dark else "#1C1917"}">{name}</div>'
        f'<div style="font-size:11px;line-height:1.4;margin-top:4px;'
        f'color:{"rgba(255,255,255,.72)" if dark else "#4A4040"}">{note}</div></div>'
        for name, hexv, note, dark in swatches
    )
    return f"""<div class="page">
  <div style="padding:46px 64px 0">
    <div class="kicker">Identity system</div>
    <h2 style="margin-top:12px">The mark is a bearing, not a compass rose.</h2>
  </div>
  <div style="padding:26px 64px 0;display:grid;grid-template-columns:220px 1fr;gap:40px;align-items:stretch">
    <div style="background:#1C1917;display:flex;align-items:center;justify-content:center;height:196px">
      <img src="file://{OUT}/logo/symbol/symbol-red-512.png" style="width:132px;height:132px">
    </div>
    <div>
      <p style="font-size:14px;max-width:74ch">A solid wedge rotated 32&deg; off vertical with a
        notched tail. The rotation is the idea: a direction already chosen, not a centred needle
        still deciding. Below 32px the notch collapses, so small exports use a simplified
        silhouette at identical optical weight.</p>
      <p style="font-size:13px;margin-top:14px;max-width:74ch"><b>Wordmark:</b> one solid word,
        <b>Maker</b> at weight 800 against <b>Compass</b> at weight 500, tracking -0.045em. The
        weight break carries the hierarchy and survives being flattened to one colour.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:20px;
        border-top:1px solid #EAE0D8">
        <div style="padding:16px 20px 0 0">
          <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:252px">
          <div class="kicker" style="margin-top:12px">Horizontal &middot; 1.3 cap</div>
        </div>
        <div style="padding:16px 20px 0;border-left:1px solid #EAE0D8">
          <img src="file://{OUT}/logo/lockup/stacked/lockup-s-black.png" style="width:158px">
          <div class="kicker" style="margin-top:12px">Stacked &middot; 1.9 cap</div>
        </div>
        <div style="padding:16px 0 0 20px;border-left:1px solid #EAE0D8">
          <img src="file://{OUT}/logo/symbol/symbol-black-256.png" style="width:48px;height:48px">
          <div class="kicker" style="margin-top:12px">Symbol alone</div>
          <div style="font-size:11px;line-height:1.45;margin-top:6px;color:#4A4040">Clear space
            is one cap height on all four sides.</div>
        </div>
      </div>
    </div>
  </div>
  <div style="margin-top:26px;display:flex">{cells}</div>
  <div style="padding:26px 64px 0;display:grid;grid-template-columns:1.05fr 1fr;gap:44px">
    <div>
      <div class="kicker">Typography</div>
      <div style="font-weight:800;font-size:44px;letter-spacing:-0.05em;line-height:1;margin-top:10px">
        Hanken Grotesk 800</div>
      <div style="font-weight:400;font-size:15px;line-height:1.5;margin-top:10px;color:#4A4040;max-width:46ch">
        Body sets at weight 400, 1rem, line-height 1.6. Display and headline tracking is
        -0.05em, never flat zero. One family carries the whole hierarchy.</div>
      <div style="font-family:'Fira Mono',monospace;font-size:11px;letter-spacing:0.18em;
        margin-top:14px;color:#8A8480">FIRA MONO / METADATA VOICE / 0.18EM</div>
      <div style="font-size:11px;line-height:1.45;margin-top:8px;color:#4A4040;max-width:46ch">
        Mono uppercase is reserved for kickers, status, and metadata. Never Hanken small caps.</div>
    </div>
    <div>
      <div class="kicker">Voice</div>
      <div style="font-size:17px;font-weight:700;letter-spacing:-0.02em;margin-top:10px;line-height:1.3">
        &ldquo;Generation is cheap now. Judgment is not.&rdquo;</div>
      <p style="font-size:12px;margin-top:12px">Quietly direct, anti-hype, specific,
        constructively critical. Short sentences, plain verbs, no em dashes. Say
        &ldquo;first version&rdquo; more than &ldquo;MVP&rdquo;.</p>
      <div style="margin-top:14px;border-top:1px solid #EAE0D8;padding-top:12px">
        <div style="font-size:11px;line-height:1.5;color:#8A8480"><b style="color:#DC2626">Never:</b>
          unlock, supercharge, revolutionize, 10x, powered by AI, seamless, effortless, elevate,
          curated, premium, cutting-edge.</div>
      </div>
    </div>
  </div>
  <div class="pageno">02 / 04</div>
</div>"""


def page_world(assets):
    def cell(slot, label, edge):
        # Captions ride a solid chip, and each row anchors to the outer edge so the
        # centre card cannot occlude one. A text shadow is not enough here: these
        # photos have light paper exactly where the captions land.
        return (
            f'<div style="position:relative">'
            f'<img src="file://{assets[slot][0]}" style="width:600px;height:425px;object-fit:cover">'
            f'<div class="chip" style="{edge}:16px;left:16px">{label}</div></div>'
        )

    return f"""<div class="page" style="background:#1C1917">
  <div style="display:grid;grid-template-columns:600px 600px;grid-template-rows:425px 425px">
    {cell('world-a', 'Sorting scope', 'top')}
    {cell('world-b', 'One card moved', 'top')}
    {cell('world-c', 'Laptop closed', 'bottom')}
    {cell('world-d', 'Committed to paper', 'bottom')}
  </div>
  <div style="position:absolute;top:0;left:0;width:{W}px;height:{H}px;
    display:flex;align-items:center;justify-content:center;pointer-events:none">
    <div style="background:#FAFAFA;padding:26px 34px;max-width:430px">
      <div class="kicker red">Visual world</div>
      <h3 style="margin-top:10px;font-size:22px;letter-spacing:-0.04em;line-height:1.1">
        A lit workshop, not a dark command center.</h3>
      <p style="font-size:12px;margin-top:10px">Real light only. Warm neutrals with exactly one
        red object in frame. Film grain always. Subjects work, they do not address the camera.
        Cast is diverse by default, named per prompt.</p>
      <p style="font-size:11px;margin-top:10px;color:#8A8480">Deliberately pre-digital: the
        thinking happens before the tooling.</p>
      <div class="kicker" style="margin-top:16px;text-align:right">03 / 04</div>
    </div>
  </div>
</div>"""


def page_applications(assets):
    dos = [
        "Leave one full cap height of clear space around the lockup, including social crops.",
        "Let one element dominate. Flat hierarchy is the tell of an undesigned page.",
        "Name the artifact (&ldquo;your first-version scope&rdquo;), not the feature.",
    ]
    donts = [
        "Don't use red for errors or focus rings. Errors are #C0392B, focus is #4A4040.",
        "Don't set display type at flat tracking. -0.05em or it reads as a wireframe.",
        "Don't ship a gradient hero, glass panel, sparkle, or &ldquo;Powered by AI&rdquo; badge.",
    ]
    li = lambda items, mark, color: "".join(
        f'<div style="display:flex;gap:9px;margin-top:9px">'
        f'<span style="color:{color};font-weight:700;font-size:12px;line-height:1.5">{mark}</span>'
        f'<span style="font-size:12px;line-height:1.5;color:#4A4040">{t}</span></div>'
        for t in items
    )
    return f"""<div class="page">
  <div style="padding:46px 64px 0">
    <div class="kicker">Starter applications</div>
    <h2 style="margin-top:12px">Where the mark has to survive first.</h2>
  </div>
  <div style="padding:24px 64px 0;display:grid;grid-template-columns:190px 1fr;gap:40px;align-items:start">
    <div>
      <div style="width:96px;height:96px;background:#DC2626;display:flex;align-items:center;
        justify-content:center">
        <img src="file://{OUT}/logo/symbol/symbol-white-256.png" style="width:56px;height:56px">
      </div>
      <div class="kicker" style="margin-top:10px">App icon / avatar</div>
      <div style="display:flex;align-items:flex-end;gap:14px;margin-top:20px">
        <div style="text-align:center">
          <img src="file://{OUT}/logo/symbol/symbol-red-32.png" style="width:32px;height:32px">
          <div class="kicker" style="margin-top:6px;font-size:9px">32</div>
        </div>
        <div style="text-align:center">
          <img src="file://{OUT}/logo/symbol/symbol-red-16.png" style="width:16px;height:16px">
          <div class="kicker" style="margin-top:6px;font-size:9px">16</div>
        </div>
      </div>
      <div class="kicker" style="margin-top:10px">Favicon, true size</div>
      <div style="font-size:11px;line-height:1.45;margin-top:8px;color:#4A4040">Simplified
        silhouette below 32px. Never scale a large export down.</div>
    </div>
    <div>
      <div style="border:1px solid #EAE0D8;background:#FAFAFA">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:13px 18px;border-bottom:1px solid #EAE0D8;background:#FFFFFF">
          <img src="file://{OUT}/logo/lockup/horizontal/lockup-h-black.png" style="width:150px">
          <div style="display:flex;align-items:center;gap:16px">
            <span class="kicker" style="font-size:9px">How it works</span>
            <span class="kicker" style="font-size:9px">Example</span>
            <span style="background:#DC2626;color:#fff;font-size:11px;font-weight:700;
              padding:7px 13px;border-radius:3px">Start with your idea</span>
          </div>
        </div>
        <div style="padding:28px 18px 26px;display:grid;grid-template-columns:1.25fr 1fr;gap:30px">
          <div>
            <div class="kicker">Before you build</div>
            <div style="font-weight:800;font-size:34px;letter-spacing:-0.05em;line-height:0.95;
              margin-top:10px;max-width:17ch">Stop putting your life's work off.</div>
            <div style="font-size:13px;color:#4A4040;margin-top:12px;max-width:46ch;line-height:1.55">
              Give it the rough idea. Get back the market context, the first version worth
              building, the scope to hold it to, and where to start.</div>
          </div>
          <div style="border-left:1px solid #EAE0D8;padding-left:24px">
            <div class="kicker">What comes back</div>
            <div style="margin-top:10px">
              <div style="font-size:12px;font-weight:700;letter-spacing:-0.01em;padding:7px 0;
                border-bottom:1px solid #EAE0D8">Market context</div>
              <div style="font-size:12px;font-weight:700;letter-spacing:-0.01em;padding:7px 0;
                border-bottom:1px solid #EAE0D8">First-version scope</div>
              <div style="font-size:12px;font-weight:700;letter-spacing:-0.01em;padding:7px 0;
                border-bottom:1px solid #EAE0D8">Mockups</div>
              <div style="font-size:12px;font-weight:700;letter-spacing:-0.01em;padding:7px 0">
                Technical direction</div>
            </div>
          </div>
        </div>
      </div>
      <div class="kicker" style="margin-top:10px">Web hero direction &nbsp;/&nbsp; sharp corners, red on one element only</div>
    </div>
  </div>
  <div style="padding:24px 64px 0;display:grid;grid-template-columns:560px 1fr;gap:40px;align-items:start">
    <div>
      <img src="file://{assets['app-shot'][0]}" style="width:560px;height:330px;object-fit:cover">
      <div class="kicker" style="margin-top:9px">Product in context &nbsp;/&nbsp; screens show real output</div>
    </div>
    <div>
      <div class="kicker red">Do</div>
      {li(dos, "&#10003;", "#1C1917")}
      <div class="kicker red" style="margin-top:18px">Don't</div>
      {li(donts, "&#10007;", "#C0392B")}
    </div>
  </div>
  <div class="pageno">04 / 04</div>
</div>"""


def render(name, body):
    html_path = os.path.join(RENDER, f"{name}.html")
    with open(html_path, "w") as fh:
        fh.write(f"<!doctype html><html><head>{head()}</head><body>{body}</body></html>")
    png = os.path.join(QA, f"{name}.png")
    pdf = os.path.join(RENDER, f"{name}.pdf")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         f"--screenshot={png}", f"--window-size={W},{H}", html_path],
        check=True, capture_output=True,
    )
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={pdf}", html_path],
        check=True, capture_output=True,
    )
    return png, pdf


def main():
    assets = prep_images()
    for slot, (path, size) in assets.items():
        print(f"  {slot:10s} {size/1000:6.1f}KB")

    pages = [
        ("page-01-cover", page_cover(assets)),
        ("page-02-identity", page_identity()),
        ("page-03-world", page_world(assets)),
        ("page-04-applications", page_applications(assets)),
    ]
    pdfs = []
    for name, body in pages:
        png, pdf = render(name, body)
        pdfs.append(pdf)
        print(f"  rendered {name}")

    final = os.path.join(OUT, "quick-brand.pdf")
    subprocess.run(["pdfunite", *pdfs, final], check=True)
    print(f"quick-brand.pdf {os.path.getsize(final)/1000:.0f}KB")


if __name__ == "__main__":
    main()
