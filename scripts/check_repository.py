#!/usr/bin/env python3
"""Validate the public repository layout without requiring game services."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    ".editorconfig",
    ".gitattributes",
    ".gitignore",
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "SUPPORT.md",
    "CHANGELOG.md",
    ".github/workflows/ci.yml",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/README.md",
    "docs/art-design.md",
    "docs/game-design.md",
    "docs/items-and-recipes.md",
    "docs/season-system.md",
    "docs/technical-architecture.md",
    "Server/Cargo.toml",
    "Server/.env.example",
    "Web/package.json",
]

LEGACY_ROOT_DOCS = [
    "Moefarm_art_design_specification - 副本.md",
    "Moefarm_art_design_specification.md",
    "Moefarm_game_design_document.md",
    "Moefarm_items_and_recipes.md",
    "Moefarm_season_system.md",
    "Moefarm_technical_architecture.md",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
if missing:
    fail("missing required files: " + ", ".join(missing))

legacy = [path for path in LEGACY_ROOT_DOCS if (ROOT / path).exists()]
if legacy:
    fail("legacy root documents still present: " + ", ".join(legacy))

with (ROOT / "Web/package.json").open(encoding="utf-8-sig") as handle:
    package = json.load(handle)
if package.get("creator", {}).get("version") != "3.8.8":
    fail("Web/package.json does not declare Cocos Creator 3.8.8")

absolute_windows_path = re.compile(r"[A-Za-z]:\\\\")
manifest_paths = list((ROOT / "Server/assets").rglob("*manifest*.json"))
for manifest in manifest_paths:
    text = manifest.read_text(encoding="utf-8-sig")
    if absolute_windows_path.search(text):
        fail(f"developer-machine absolute path found in {manifest.relative_to(ROOT)}")
    json.loads(text)

link_pattern = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
markdown_paths = list(ROOT.glob("*.md")) + list((ROOT / "docs").rglob("*.md"))
checked_links = 0
for markdown in markdown_paths:
    for raw_target in link_pattern.findall(markdown.read_text(encoding="utf-8-sig")):
        target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        relative = unquote(target.split("#", 1)[0])
        if not relative:
            continue
        checked_links += 1
        if not (markdown.parent / relative).resolve().exists():
            fail(f"broken local link in {markdown.relative_to(ROOT)}: {target}")

print(f"PASS repository layout: {len(REQUIRED_FILES)} required files present")
print("PASS documentation layout: active docs are under docs/ and legacy docs are archived")
print(f"PASS portable manifests: {len(manifest_paths)} JSON manifests contain no Windows absolute paths")
print(f"PASS documentation links: {checked_links} local targets resolve")
