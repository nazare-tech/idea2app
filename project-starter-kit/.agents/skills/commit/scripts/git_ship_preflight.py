#!/usr/bin/env python3
"""Print a non-destructive Git state report for the shipping workflow."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def run_git(args: list[str]) -> tuple[int, str, str]:
    result = subprocess.run(
        ["git", *args],
        cwd=Path.cwd(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def print_section(title: str, body: str) -> None:
    print(f"\n## {title}")
    print(body if body else "(none)")


def get_integration_branch() -> str:
    for candidate in ("main", "master"):
        code, _, _ = run_git(["rev-parse", "--verify", candidate])
        if code == 0:
            return candidate
    return "main"


def main() -> int:
    code, root, err = run_git(["rev-parse", "--show-toplevel"])
    if code != 0:
        print(err or "Not inside a Git repository.", file=sys.stderr)
        return 1

    integration_branch = get_integration_branch()
    checks = [
        ("Repository", root),
        ("Integration Branch", integration_branch),
        ("Status", run_git(["status", "--short", "--branch"])[1]),
        ("Current Branch", run_git(["branch", "--show-current"])[1]),
        ("Remotes", run_git(["remote", "-v"])[1]),
        ("Diff Stat", run_git(["diff", "--stat"])[1]),
        (
            f"Local Branches Merged Into {integration_branch}",
            run_git(["branch", "--merged", integration_branch])[1],
        ),
        (
            f"Local Branches Not Merged Into {integration_branch}",
            run_git(["branch", "--no-merged", integration_branch])[1],
        ),
    ]

    print("# Git Ship Preflight")
    for title, body in checks:
        print_section(title, body)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
