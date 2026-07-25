#!/usr/bin/env python3
"""Create a collision-safe Maker Compass skill run directory."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path


ALLOWED_PLATFORMS = {
    "desktop-web",
    "mobile-web",
    "native-mobile-app",
    "native-desktop-app",
}
DEFAULT_PLATFORMS = ["native-mobile-app", "desktop-web"]
DIRECTIONS = ["A", "B", "C"]


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug[:64] or "untitled-idea"


def unique_run_dir(root: Path, base_slug: str) -> Path:
    candidate = root / base_slug
    if not candidate.exists():
        return candidate
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    candidate = root / f"{base_slug}-{stamp}"
    counter = 2
    while candidate.exists():
        candidate = root / f"{base_slug}-{stamp}-{counter}"
        counter += 1
    return candidate


def parse_platforms(value: str) -> list[str]:
    platforms = [part.strip() for part in value.split(",") if part.strip()]
    invalid = [platform for platform in platforms if platform not in ALLOWED_PLATFORMS]
    if invalid:
        raise argparse.ArgumentTypeError(
            f"Unsupported platform(s): {', '.join(invalid)}. "
            f"Allowed: {', '.join(sorted(ALLOWED_PLATFORMS))}"
        )
    if not platforms:
        raise argparse.ArgumentTypeError("At least one platform is required")
    return list(dict.fromkeys(platforms))


def build_manifest(title: str, idea: str, slug: str, platforms: list[str]) -> dict:
    artifacts = [
        "01-idea-brief.md",
        "02-market-research.md",
        "03-product-plan.md",
        "04-first-version-plan.md",
        "ai-prompts/first-prompt.md",
        "ai-prompts/build-steps.md",
        "ai-prompts/functional-requirements.md",
        "ai-prompts/user-stories-and-acceptance-criteria.md",
        "ai-prompts/technical-considerations.md",
        "ai-prompts/sub-agents.md",
        "ai-prompts/project-context.md",
        "mockups/design-plan.md",
        "run-summary.md",
    ]
    images = []
    prompts = []
    for platform in platforms:
        artifacts.append(f"mockups/{platform}/design-plan.json")
        for direction in DIRECTIONS:
            suffix = direction.lower()
            prompts.append(f"mockups/image-prompts/{platform}-option-{suffix}.md")
            images.append(
                {
                    "platform": platform,
                    "direction": direction,
                    "path": f"mockups/images/{platform}-option-{suffix}.png",
                    "status": "pending",
                    "sha256": None,
                    "visualQa": "pending",
                }
            )

    return {
        "schemaVersion": "maker-compass-codex-run-v1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "title": title,
        "slug": slug,
        "idea": idea,
        "source": {
            "type": "unspecified",
            "evidenceCollectedAt": None,
            "evidence": [],
            "caveats": [],
        },
        "platforms": platforms,
        "directions": DIRECTIONS,
        "artifacts": {path: {"status": "pending", "sha256": None} for path in artifacts},
        "imagePrompts": {path: {"status": "pending", "sha256": None} for path in prompts},
        "images": images,
        "validation": {
            "structural": "pending",
            "visual": "pending",
            "reportPath": "validation.json",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--idea", required=True, help="Original product idea")
    parser.add_argument("--title", required=True, help="Chosen product name")
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--slug", help="Optional stable folder slug")
    parser.add_argument(
        "--platforms",
        type=parse_platforms,
        default=DEFAULT_PLATFORMS,
        help="Comma-separated platform list",
    )
    args = parser.parse_args()

    title = args.title.strip()
    idea = args.idea.strip()
    if not title:
        parser.error("--title must contain non-whitespace text")
    if not idea:
        parser.error("--idea must contain non-whitespace text")

    root = args.output_root.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    base_slug = slugify(args.slug or title)
    run_dir = unique_run_dir(root, base_slug)
    run_dir.mkdir()
    directories = ["ai-prompts", "mockups/image-prompts", "mockups/images"]
    directories.extend(f"mockups/{platform}" for platform in args.platforms)
    for relative in directories:
        (run_dir / relative).mkdir(parents=True)

    manifest = build_manifest(title, idea, run_dir.name, args.platforms)
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(run_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
