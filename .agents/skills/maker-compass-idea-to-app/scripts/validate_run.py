#!/usr/bin/env python3
"""Validate a Maker Compass Codex run and write validation.json."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from pathlib import Path


MARKET_HEADINGS = [
    "Executive Summary",
    "Direct Competitors",
    "Feature Comparison",
    "Pricing Comparison",
    "Best Customer Segments",
    "Competitive Landscape Overview",
    "Positioning Map",
    "How You'll Reach Customers",
    "Gap Analysis",
    "Ways to Stand Out",
    "What Makes It Hard to Copy",
    "First Version Focus",
    "Recommended Next Moves",
]
PRODUCT_HEADINGS = [
    "Introduction/overview",
    "Goals",
    "Team and Milestones",
    "Success metrics",
    "User personas",
    "Functional requirements",
    "User stories and acceptance criteria",
    "Non-goals / out of scope",
    "Technical considerations",
    "Risks and mitigation",
    "Dependencies and assumptions",
    "Open questions",
]
FIRST_VERSION_HEADINGS = [
    "MVP Summary",
    "Key Risks, Assumptions, and Scope Decisions",
    "Target User and Problem",
    "MVP Goal, Definition of Done, and Riskiest Assumptions",
    "Core User Flows",
    "Suggested Build Approach",
    "Recommended AI Build Tool",
    "AI-Friendly Build Sequence",
    "Validation Plan",
    "Next Prompt for AI Coding Tool",
]
IDEA_HEADINGS = [
    "Idea",
    "Product name",
    "Target user",
    "Problem and current workaround",
    "Core workflow",
    "Business model hypothesis",
    "Launch priority",
    "Platform scope",
    "Constraints",
    "Assumptions",
    "Evidence status",
]
AI_PROMPT_FILES = [
    "first-prompt.md",
    "build-steps.md",
    "functional-requirements.md",
    "user-stories-and-acceptance-criteria.md",
    "technical-considerations.md",
    "sub-agents.md",
    "project-context.md",
]
ALLOWED_PLATFORMS = {
    "desktop-web",
    "mobile-web",
    "native-mobile-app",
    "native-desktop-app",
}
DIRECTIONS = ["A", "B", "C"]
BASE_ARTIFACTS = {
    "01-idea-brief.md",
    "02-market-research.md",
    "03-product-plan.md",
    "04-first-version-plan.md",
    "mockups/design-plan.md",
    "run-summary.md",
    *(f"ai-prompts/{name}" for name in AI_PROMPT_FILES),
}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def normalize_heading(value: str) -> str:
    return re.sub(r"^\d+(?:\.\d+)*\.?\s*", "", value).strip().casefold()


def h2_headings(text: str) -> list[str]:
    return [match.group(1).strip() for match in re.finditer(r"^##\s+(.+?)\s*$", text, re.M)]


def h1_heading(text: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", text, re.M)
    return match.group(1).strip() if match else ""


def safe_run_path(run_dir: Path, relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"Unsafe path outside run directory: {relative}")
    resolved = (run_dir / candidate).resolve()
    try:
        resolved.relative_to(run_dir)
    except ValueError as exc:
        raise ValueError(f"Unsafe path outside run directory: {relative}") from exc
    return resolved


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) < 24 or header[:8] != PNG_SIGNATURE or header[12:16] != b"IHDR":
        raise ValueError("not a valid PNG")
    return struct.unpack(">II", header[16:24])


def expected_ratio_range(platform: str) -> tuple[float, float]:
    return (1.15, 1.70) if "mobile" in platform else (1.95, 2.70)


def check_markdown(
    run_dir: Path,
    relative: str,
    required_headings: list[str] | None,
    exact_order: bool,
    errors: list[str],
    hashes: dict[str, str],
    valid_paths: set[str],
    required_h1_prefix: str | None = None,
) -> None:
    error_count = len(errors)
    try:
        path = safe_run_path(run_dir, relative)
    except ValueError as exc:
        errors.append(str(exc))
        return
    if not path.is_file():
        errors.append(f"Missing file: {relative}")
        return
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        errors.append(f"Empty file: {relative}")
        return
    if re.search(r"\b(?:TBD|TODO)\b|<\s*(?:product name|idea|target user)\s*>|\[\s*(?:product name|idea|target user)\s*\]", text, re.I):
        errors.append(f"Unresolved placeholder in {relative}")
    if required_h1_prefix and not h1_heading(text).startswith(required_h1_prefix):
        errors.append(f"Incorrect H1 in {relative}: {h1_heading(text)!r}")
    if required_headings:
        actual = [normalize_heading(value) for value in h2_headings(text)]
        expected = [normalize_heading(value) for value in required_headings]
        if exact_order:
            if actual != expected:
                errors.append(f"Incorrect H2 contract in {relative}: {h2_headings(text)}")
        else:
            missing = [heading for heading, normalized in zip(required_headings, expected) if normalized not in actual]
            if missing:
                errors.append(f"Missing H2 headings in {relative}: {', '.join(missing)}")
    if len(errors) == error_count:
        hashes[relative] = sha256(path)
        valid_paths.add(relative)


def check_design_plan(
    run_dir: Path,
    platform: str,
    errors: list[str],
    hashes: dict[str, str],
    valid_paths: set[str],
) -> None:
    relative = f"mockups/{platform}/design-plan.json"
    try:
        path = safe_run_path(run_dir, relative)
    except ValueError as exc:
        errors.append(str(exc))
        return
    error_count = len(errors)
    if not path.is_file():
        errors.append(f"Missing file: {relative}")
        return
    try:
        plan = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {relative}: {exc}")
        return
    if not isinstance(plan, dict):
        errors.append(f"{relative} must contain a JSON object")
        return
    if plan.get("version") != "mockup-design-plan-v1":
        errors.append(f"Incorrect version in {relative}")
    if plan.get("primaryPlatform") != platform:
        errors.append(f"Incorrect primaryPlatform in {relative}")
    for field in ["happyPathScenario", "targetUser"]:
        if not isinstance(plan.get(field), str) or not plan[field].strip():
            errors.append(f"Missing {field} in {relative}")
    screens = plan.get("screens")
    if not isinstance(screens, list) or len(screens) != 2:
        errors.append(f"{relative} must contain exactly two screens")
    else:
        for index, screen in enumerate(screens, start=1):
            required = ["name", "caption", "purpose", "happyPathState", "priority"]
            if not isinstance(screen, dict) or any(not str(screen.get(key, "")).strip() for key in required):
                errors.append(f"Screen {index} missing required fields in {relative}")
            if not isinstance(screen.get("flowStep"), (int, float)):
                errors.append(f"Screen {index} missing numeric flowStep in {relative}")
            data = screen.get("dataToShow")
            if not isinstance(data, list) or not any(str(item).strip() for item in data):
                errors.append(f"Screen {index} missing dataToShow in {relative}")
    directions = plan.get("directions")
    if not isinstance(directions, list) or len(directions) != 3:
        errors.append(f"{relative} must contain exactly three directions")
    else:
        labels = [item.get("label") for item in directions if isinstance(item, dict)]
        if labels != ["A", "B", "C"]:
            errors.append(f"Directions must be ordered A, B, C in {relative}")
        for index, direction in enumerate(directions, start=1):
            required = ["name", "layoutStrategy", "navigationPattern", "density", "visualTone", "consistencyNotes"]
            if not isinstance(direction, dict) or any(not str(direction.get(key, "")).strip() for key in required):
                errors.append(f"Direction {index} missing required fields in {relative}")
            motifs = direction.get("reusableMotifs")
            if not isinstance(motifs, list) or not any(str(item).strip() for item in motifs):
                errors.append(f"Direction {index} missing reusableMotifs in {relative}")
    if len(errors) == error_count:
        hashes[relative] = sha256(path)
        valid_paths.add(relative)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dir", type=Path)
    parser.add_argument("--allow-missing-images", action="store_true")
    parser.add_argument("--no-write", action="store_true")
    args = parser.parse_args()

    run_dir = args.run_dir.expanduser().resolve()
    manifest_path = run_dir / "manifest.json"
    errors: list[str] = []
    warnings: list[str] = []
    hashes: dict[str, str] = {}
    valid_paths: set[str] = set()
    image_results: list[dict] = []

    if not manifest_path.is_file():
        errors.append("Missing file: manifest.json")
        manifest = {}
    else:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"Invalid manifest.json: {exc}")
            manifest = {}
        if not isinstance(manifest, dict):
            errors.append("manifest.json must contain a JSON object")
            manifest = {}

    if manifest.get("schemaVersion") != "maker-compass-codex-run-v1":
        errors.append("manifest.json has unsupported schemaVersion")

    platforms = manifest.get("platforms")
    if not isinstance(platforms, list) or not platforms:
        errors.append("manifest.json platforms must be a non-empty list")
        platforms = []
    elif len(platforms) != len(set(platforms)) or any(platform not in ALLOWED_PLATFORMS for platform in platforms):
        errors.append("manifest.json platforms contain duplicates or unsupported values")
    if manifest.get("directions") != DIRECTIONS:
        errors.append("manifest.json directions must be exactly A, B, C")

    expected_artifacts = BASE_ARTIFACTS | {
        f"mockups/{platform}/design-plan.json" for platform in platforms
    }
    artifact_map = manifest.get("artifacts")
    if (
        not isinstance(artifact_map, dict)
        or set(artifact_map) != expected_artifacts
        or any(not isinstance(item, dict) for item in artifact_map.values())
    ):
        errors.append("manifest.json artifacts map does not match required canonical paths")

    expected_prompt_paths = {
        f"mockups/image-prompts/{platform}-option-{direction.lower()}.md"
        for platform in platforms
        for direction in DIRECTIONS
    }
    prompt_map = manifest.get("imagePrompts")
    if (
        not isinstance(prompt_map, dict)
        or set(prompt_map) != expected_prompt_paths
        or any(not isinstance(item, dict) for item in prompt_map.values())
    ):
        errors.append("manifest.json imagePrompts map does not match platform/direction cross-product")

    expected_image_keys = {
        (
            platform,
            direction,
            f"mockups/images/{platform}-option-{direction.lower()}.png",
        )
        for platform in platforms
        for direction in DIRECTIONS
    }
    manifest_images = manifest.get("images")
    actual_image_keys = {
        (item.get("platform"), item.get("direction"), item.get("path"))
        for item in manifest_images
        if isinstance(item, dict)
    } if isinstance(manifest_images, list) else set()
    if actual_image_keys != expected_image_keys or len(manifest_images or []) != len(expected_image_keys):
        errors.append("manifest.json images do not match platform/direction canonical paths")

    check_markdown(run_dir, "01-idea-brief.md", IDEA_HEADINGS, False, errors, hashes, valid_paths)
    check_markdown(run_dir, "02-market-research.md", MARKET_HEADINGS, True, errors, hashes, valid_paths, "Competitive Analysis:")
    check_markdown(run_dir, "03-product-plan.md", PRODUCT_HEADINGS, True, errors, hashes, valid_paths, "PRD:")
    check_markdown(run_dir, "04-first-version-plan.md", FIRST_VERSION_HEADINGS, True, errors, hashes, valid_paths, "MVP Plan:")
    check_markdown(run_dir, "mockups/design-plan.md", None, False, errors, hashes, valid_paths)
    check_markdown(run_dir, "run-summary.md", None, False, errors, hashes, valid_paths)

    for name in AI_PROMPT_FILES:
        check_markdown(run_dir, f"ai-prompts/{name}", None, False, errors, hashes, valid_paths)

    for prompt_path in prompt_map if isinstance(prompt_map, dict) else []:
        check_markdown(run_dir, prompt_path, None, False, errors, hashes, valid_paths)

    for platform in platforms:
        check_design_plan(run_dir, platform, errors, hashes, valid_paths)

    images = [item for item in manifest_images if isinstance(item, dict)] if isinstance(manifest_images, list) else []
    expected_count = len(platforms) * 3
    if len(images) != expected_count:
        errors.append(f"manifest.json must list {expected_count} images, found {len(images)}")

    for image in images:
        relative = image.get("path", "")
        platform = image.get("platform", "")
        result = {"path": relative, "platform": platform, "valid": False}
        try:
            path = safe_run_path(run_dir, relative)
        except ValueError as exc:
            errors.append(str(exc))
            image_results.append(result)
            continue
        if not path.is_file():
            message = f"Missing image: {relative}"
            (warnings if args.allow_missing_images else errors).append(message)
            image_results.append(result)
            continue
        try:
            width, height = read_png_dimensions(path)
            ratio = width / height
            minimum, maximum = expected_ratio_range(platform)
            result.update({"width": width, "height": height, "ratio": ratio})
            if not minimum <= ratio <= maximum:
                errors.append(
                    f"Image aspect outside {minimum:.2f}-{maximum:.2f}: "
                    f"{relative} is {width}x{height} ({ratio:.3f})"
                )
            else:
                result["valid"] = True
                hashes[relative] = sha256(path)
                valid_paths.add(relative)
        except ValueError as exc:
            errors.append(f"Invalid image {relative}: {exc}")
        image_results.append(result)

    if not args.allow_missing_images:
        for image in images:
            if image.get("visualQa") != "passed":
                errors.append(f"Visual QA not passed: {image.get('path', '')}")
        validation_state = manifest.get("validation")
        if not isinstance(validation_state, dict) or validation_state.get("visual") != "passed":
            errors.append("manifest validation.visual must be 'passed'")

    passed = not errors
    report = {
        "schemaVersion": "maker-compass-codex-validation-v1",
        "passed": passed,
        "errors": errors,
        "warnings": warnings,
        "hashes": hashes,
        "images": image_results,
        "note": "Two-frame composition and chrome preservation require visual QA.",
    }

    if not args.no_write:
        (run_dir / "validation.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        if manifest:
            if not isinstance(manifest.get("validation"), dict):
                manifest["validation"] = {}
            manifest["validation"]["structural"] = "passed" if passed else "failed"
            for relative, digest in hashes.items():
                artifact_item = manifest.get("artifacts", {}).get(relative) if isinstance(manifest.get("artifacts"), dict) else None
                if isinstance(artifact_item, dict):
                    artifact_item.update(status="complete", sha256=digest)
                prompt_item = manifest.get("imagePrompts", {}).get(relative) if isinstance(manifest.get("imagePrompts"), dict) else None
                if isinstance(prompt_item, dict):
                    prompt_item.update(status="complete", sha256=digest)
                for image in manifest.get("images", []):
                    if isinstance(image, dict) and image.get("path") == relative:
                        image.update(
                            status="complete" if image.get("visualQa") == "passed" else "needs-visual-qa",
                            sha256=digest,
                        )
            artifacts_to_update = manifest.get("artifacts", {})
            for relative, item in artifacts_to_update.items() if isinstance(artifacts_to_update, dict) else []:
                try:
                    exists = safe_run_path(run_dir, relative).exists()
                except ValueError:
                    continue
                if exists and relative not in valid_paths and isinstance(item, dict):
                    item["status"] = "failed"
            prompts_to_update = manifest.get("imagePrompts", {})
            for relative, item in prompts_to_update.items() if isinstance(prompts_to_update, dict) else []:
                try:
                    exists = safe_run_path(run_dir, relative).exists()
                except ValueError:
                    continue
                if exists and relative not in valid_paths and isinstance(item, dict):
                    item["status"] = "failed"
            manifest_path.write_text(
                json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

    print(json.dumps({"passed": passed, "errors": errors, "warnings": warnings}, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
