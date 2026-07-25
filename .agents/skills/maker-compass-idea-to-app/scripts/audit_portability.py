#!/usr/bin/env python3
"""Audit bundled executable scripts for direct network/model dependencies."""

from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path


FORBIDDEN_IMPORT_ROOTS = {
    "aiohttp",
    "anthropic",
    "ftplib",
    "http",
    "httpx",
    "openai",
    "requests",
    "socket",
    "subprocess",
    "urllib",
}
FORBIDDEN_EXECUTION_TOKENS = {
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "api.openai.com",
    "openrouter.ai/api",
    "curl",
    "wget",
}


def imported_roots(tree: ast.AST) -> set[str]:
    roots: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            roots.add(node.module.split(".")[0])
    return roots


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_dir", nargs="?", type=Path)
    args = parser.parse_args()
    skill_dir = (args.skill_dir or Path(__file__).resolve().parents[1]).resolve()
    findings: list[str] = []

    for path in sorted((skill_dir / "scripts").rglob("*.py")):
        text = path.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, filename=str(path))
        except SyntaxError as exc:
            findings.append(f"{path.name}: syntax error: {exc}")
            continue
        forbidden = imported_roots(tree) & FORBIDDEN_IMPORT_ROOTS
        if forbidden:
            findings.append(f"{path.name}: forbidden imports: {', '.join(sorted(forbidden))}")
        if path.name != Path(__file__).name:
            for token in FORBIDDEN_EXECUTION_TOKENS:
                if token in text:
                    findings.append(f"{path.name}: forbidden execution token: {token}")
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name) and node.func.value.id == "os" and node.func.attr in {"system", "popen"}:
                        findings.append(f"{path.name}: forbidden process execution: os.{node.func.attr}")

    result = {"passed": not findings, "findings": findings}
    print(json.dumps(result, indent=2))
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
