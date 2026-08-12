#!/usr/bin/env python3
"""Verify every ImageCache URL maps to a real backend static asset."""

from __future__ import annotations

import os
import re
import sys
import urllib.error
import urllib.request
from argparse import ArgumentParser
from pathlib import Path


SERVER = Path(__file__).resolve().parents[1]
ROOT = SERVER.parent
ASSETS = SERVER / "assets"
IMAGE_CACHE = ROOT / "Web/assets/scripts/utils/ImageCache.ts"


def object_block(source: str, name: str, next_marker: str) -> str:
    start = source.index(f"const {name}")
    end = source.index(next_marker, start)
    return source[start:end]


def string_map(block: str) -> dict[str, str]:
    return dict(
        re.findall(r'^\s*([A-Za-z0-9_]+)\s*:\s*"([^"]+)"', block, re.MULTILINE)
    )


def normalized_asset(relative: str) -> Path:
    normalized = os.path.normpath(relative).replace("\\", "/")
    candidate = (ASSETS / normalized).resolve()
    try:
        candidate.relative_to(ASSETS.resolve())
    except ValueError as exc:
        raise ValueError(f"asset path escapes Server/assets: {relative}") from exc
    return candidate


def main() -> int:
    parser = ArgumentParser()
    parser.add_argument(
        "--base-url",
        help="also issue HTTP HEAD requests, e.g. http://127.0.0.1:3000/assets",
    )
    args = parser.parse_args()
    source = IMAGE_CACHE.read_text(encoding="utf-8")
    categories = string_map(object_block(source, "CATEGORY_MAP", "const ITEM_IMAGE_ID_MAP"))
    item_aliases = string_map(object_block(source, "ITEM_IMAGE_ID_MAP", "function resolveItemImageId"))
    ui_icons = string_map(object_block(source, "UI_ICON_MAP", "type LoadPriority"))

    requested: dict[str, list[str]] = {}
    for key, category in categories.items():
        image_id = item_aliases.get(key, key)
        stage = re.fullmatch(r"(.+)_stage_[123]", image_id)
        asset_id = f"{stage.group(1)}_stages" if stage else image_id
        relative = f"textures/items/{category}/item_{asset_id}.png"
        requested.setdefault(relative, []).append(f"item:{key}")

    for key, filename in ui_icons.items():
        relative = os.path.normpath(f"textures/ui/{filename}.png").replace("\\", "/")
        requested.setdefault(relative, []).append(f"ui:{key}")

    missing = []
    for relative, callers in sorted(requested.items()):
        if not normalized_asset(relative).is_file():
            missing.append((relative, callers))

    png_files = {
        path.relative_to(ASSETS).as_posix() for path in ASSETS.rglob("*.png")
    }
    unreferenced = sorted(png_files - set(requested))
    empty_directories = sorted(
        path.relative_to(ASSETS).as_posix()
        for path in ASSETS.rglob("*")
        if path.is_dir() and not any(path.iterdir())
    )

    print(f"item keys: {len(categories)}")
    print(f"ui keys: {len(ui_icons)}")
    print(f"unique requested PNGs: {len(requested)}")
    print(f"missing requested PNGs: {len(missing)}")
    for relative, callers in missing:
        print(f"MISSING {relative} <- {', '.join(callers)}")

    http_failures = []
    if args.base_url:
        base_url = args.base_url.rstrip("/")
        for relative in sorted(requested):
            url = f"{base_url}/{relative}"
            request = urllib.request.Request(url, method="HEAD")
            try:
                with urllib.request.urlopen(request, timeout=5) as response:
                    if response.status != 200:
                        http_failures.append((url, response.status))
            except urllib.error.HTTPError as exc:
                http_failures.append((url, exc.code))
            except urllib.error.URLError as exc:
                http_failures.append((url, str(exc.reason)))
        print(f"HTTP failures: {len(http_failures)}")
        for url, reason in http_failures:
            print(f"HTTP_FAIL {reason} {url}")
    print(f"unreferenced PNGs: {len(unreferenced)}")
    for relative in unreferenced:
        print(f"UNREFERENCED {relative}")
    print(f"empty directories: {len(empty_directories)}")
    for relative in empty_directories:
        print(f"EMPTY_DIR {relative}")

    return 1 if missing or http_failures else 0


if __name__ == "__main__":
    sys.exit(main())
