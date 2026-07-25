#!/usr/bin/env python3
"""Build a zero-dependency HTML gallery for one or more completed runs."""

from __future__ import annotations

import argparse
import html
import json
import shutil
from pathlib import Path


def safe_child(root: Path, relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"Unsafe image path: {relative}")
    resolved = (root / candidate).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"Unsafe image path: {relative}") from exc
    return resolved


def render_run(run_dir: Path, output_dir: Path, asset_root: Path) -> str:
    try:
        manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot read {run_dir / 'manifest.json'}: {exc}") from exc
    if not isinstance(manifest, dict):
        raise ValueError(f"{run_dir / 'manifest.json'} must contain a JSON object")
    images = manifest.get("images")
    if not isinstance(images, list):
        raise ValueError(f"{run_dir / 'manifest.json'} must contain an images list")
    cards = []
    for index, image in enumerate(images, start=1):
        if not isinstance(image, dict) or not isinstance(image.get("path"), str):
            raise ValueError(f"Image {index} in {run_dir / 'manifest.json'} has no valid path")
        if image.get("status") != "complete":
            raise ValueError(f"Image is not complete: {image['path']}")
        image_path = safe_child(run_dir, image["path"])
        if not image_path.is_file():
            raise ValueError(f"Missing image: {image['path']}")
        copied_image = asset_root / run_dir.name / image_path.name
        copied_image.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image_path, copied_image)
        relative = copied_image.relative_to(output_dir).as_posix()
        cards.append(
            '<figure><img loading="lazy" src="{}" alt="{} {}"><figcaption>{} · Option {}</figcaption></figure>'.format(
                html.escape(str(relative)),
                html.escape(manifest.get("title", "Idea")),
                html.escape(image.get("direction", "")),
                html.escape(image.get("platform", "")),
                html.escape(image.get("direction", "")),
            )
        )
    return (
        f'<section><h2>{html.escape(manifest.get("title", run_dir.name))}</h2>'
        f'<p>{html.escape(manifest.get("idea", ""))}</p><div class="grid">'
        + "".join(cards)
        + "</div></section>"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, help="Run directory or directory containing runs")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    output = (args.out or root / "gallery.html").expanduser().resolve()
    candidates = [root] if (root / "manifest.json").is_file() else sorted(
        path.parent for path in root.glob("*/manifest.json")
    )
    if not candidates:
        raise SystemExit("No manifest.json files found")
    output.parent.mkdir(parents=True, exist_ok=True)
    asset_root = output.parent / f"{output.stem}-assets"
    try:
        body = "".join(render_run(run_dir, output.parent, asset_root) for run_dir in candidates)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    document = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maker Compass Mockup Gallery</title><style>
body{{margin:0;background:#f6f3ef;color:#211d19;font:15px/1.5 system-ui,sans-serif}}main{{max-width:1600px;margin:auto;padding:40px}}section{{margin:0 0 72px}}h1{{font-size:34px}}h2{{font-size:26px;margin-bottom:4px}}p{{color:#665e57;max-width:900px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}}figure{{margin:0;background:white;border:1px solid #ded7d0;padding:10px}}img{{width:100%;height:auto;display:block}}figcaption{{padding:10px 4px 2px;font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:#756d65}}
</style></head><body><main><h1>Maker Compass Mockup Gallery</h1>{body}</main></body></html>"""
    output.write_text(document, encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
