#!/usr/bin/env python3
"""Emit tokens.css / tokens.json / tailwind snippet from the live design system.

Everything is derived from DESIGN.json + DESIGN.md front matter rather than
retyped, so the exported kit cannot drift away from what the product actually
ships. Run this again after any DESIGN.json change.
"""
import json
import os
import re

OUT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(OUT, "..", "..", ".."))
TOKENS = os.path.join(OUT, "tokens")


def load_design_md_front_matter():
    with open(os.path.join(REPO, "DESIGN.md")) as fh:
        text = fh.read()
    block = text.split("---", 2)[1]
    data = {}
    section = None
    key = None
    for raw in block.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        line = raw.strip()
        if indent == 0 and line.endswith(":"):
            section = line[:-1]
            data[section] = {}
            key = None
        elif indent == 0:
            continue
        elif section and indent == 2 and ": " in line:
            k, v = line.split(": ", 1)
            data[section][k.strip()] = v.strip().strip('"')
        elif section and indent == 2 and line.endswith(":"):
            key = line[:-1]
            data[section][key] = {}
        elif section and key and indent >= 4 and ": " in line:
            k, v = line.split(": ", 1)
            data[section][key][k.strip()] = v.strip().strip('"')
    return data


def main():
    fm = load_design_md_front_matter()
    with open(os.path.join(REPO, "DESIGN.json")) as fh:
        design = json.load(fh)
    motion = {m["name"]: m["value"] for m in design["extensions"]["motion"]}
    shadows = design["extensions"]["shadows"]
    if isinstance(shadows, list):
        shadows = {s["name"]: s["value"] for s in shadows}

    colors = fm["colors"]
    rounded = fm["rounded"]
    spacing = fm["spacing"]
    typography = fm["typography"]

    payload = {
        "$meta": {
            "brand": "Maker Compass",
            "source": "DESIGN.json + DESIGN.md front matter",
            "generated": "2026-07-30",
        },
        "color": colors,
        "font": {
            "display": "Hanken Grotesk",
            "body": "Hanken Grotesk",
            "label": "Fira Mono",
            "displayStack": '"Hanken Grotesk", system-ui, sans-serif',
            "labelStack": '"Fira Mono", ui-monospace, monospace',
        },
        "fontSize": {k: v["fontSize"] for k, v in typography.items()},
        "fontWeight": {k: int(v["fontWeight"]) for k, v in typography.items()},
        "lineHeight": {k: v["lineHeight"] for k, v in typography.items()},
        "letterSpacing": {k: v["letterSpacing"] for k, v in typography.items()},
        "spacing": spacing,
        "radius": rounded,
        "shadow": shadows,
        "motion": motion,
    }

    with open(os.path.join(TOKENS, "tokens.json"), "w") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")

    lines = [
        "/* Maker Compass design tokens.",
        " * Generated from DESIGN.json + DESIGN.md - do not hand-edit.",
        " * Paste into your global stylesheet's :root.",
        " */",
        ":root {",
        "  /* Color */",
    ]
    for k, v in colors.items():
        lines.append(f"  --color-{k}: {v};")
    lines += ["", "  /* Type */"]
    lines.append(f'  --font-display: {payload["font"]["displayStack"]};')
    lines.append(f'  --font-body: {payload["font"]["displayStack"]};')
    lines.append(f'  --font-label: {payload["font"]["labelStack"]};')
    for k in typography:
        lines.append(f'  --font-size-{k}: {typography[k]["fontSize"]};')
    for k in typography:
        lines.append(f'  --font-weight-{k}: {typography[k]["fontWeight"]};')
    for k in typography:
        lines.append(f'  --line-height-{k}: {typography[k]["lineHeight"]};')
    for k in typography:
        ls = typography[k]["letterSpacing"]
        lines.append(f"  --letter-spacing-{k}: {ls};")
    lines += ["", "  /* Space */"]
    for k, v in spacing.items():
        lines.append(f"  --space-{k}: {v};")
    lines += ["", "  /* Radius */"]
    for k, v in rounded.items():
        lines.append(f"  --radius-{k}: {v};")
    lines += ["", "  /* Elevation */"]
    for k, v in shadows.items():
        lines.append(f"  --shadow-{k}: {v};")
    lines += ["", "  /* Motion */"]
    for k, v in motion.items():
        lines.append(f"  --motion-{k}: {v};")
    lines.append("}")
    with open(os.path.join(TOKENS, "tokens.css"), "w") as fh:
        fh.write("\n".join(lines) + "\n")

    def js(obj, indent):
        pad = " " * indent
        body = "\n".join(
            f'{pad}  {json.dumps(k)}: {json.dumps(v)},' for k, v in obj.items()
        )
        return "{\n" + body + "\n" + pad + "}"

    snippet = f"""// Maker Compass - paste inside module.exports.theme.extend
// Generated from DESIGN.json + DESIGN.md - do not hand-edit.
colors: {js(colors, 0)},
fontFamily: {{
  display: ["Hanken Grotesk", "system-ui", "sans-serif"],
  body: ["Hanken Grotesk", "system-ui", "sans-serif"],
  label: ["Fira Mono", "ui-monospace", "monospace"],
}},
fontSize: {js({k: v["fontSize"] for k, v in typography.items()}, 0)},
borderRadius: {js(rounded, 0)},
spacing: {js(spacing, 0)},
boxShadow: {js(shadows, 0)},
transitionTimingFunction: {js({k: v for k, v in motion.items() if k.startswith("ease")}, 0)},
transitionDuration: {js({k.replace("duration-", ""): v for k, v in motion.items() if k.startswith("duration")}, 0)},
"""
    with open(os.path.join(TOKENS, "tailwind.config.snippet.js"), "w") as fh:
        fh.write(snippet)

    print(
        f"tokens: {len(colors)} colors, {len(typography)} type roles, "
        f"{len(shadows)} shadows, {len(motion)} motion"
    )


if __name__ == "__main__":
    main()
