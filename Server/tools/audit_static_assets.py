#!/usr/bin/env python3
"""Audit runtime image paths against the backend static-asset directory."""

from __future__ import annotations

import os
import json
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
SEASONS = ("spring", "summer", "autumn", "winter")


def object_block(source: str, name: str, next_marker: str) -> str:
    start = source.index(f"const {name}")
    end = source.index(next_marker, start)
    return source[start:end]


def string_map(block: str) -> dict[str, str]:
    return dict(
        re.findall(r'^\s*([A-Za-z0-9_]+)\s*:\s*"([^"]+)"', block, re.MULTILINE)
    )


def object_keys(block: str) -> set[str]:
    return set(
        re.findall(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", block, re.MULTILINE)
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
    parser.add_argument(
        "--json-out",
        type=Path,
        help="write the complete machine-readable audit report to this path",
    )
    parser.add_argument(
        "--image-cache",
        type=Path,
        default=IMAGE_CACHE,
        help="ImageCache.ts to inspect (defaults to the active client source)",
    )
    args = parser.parse_args()
    source = args.image_cache.read_text(encoding="utf-8-sig")
    categories = string_map(object_block(source, "CATEGORY_MAP", "const ITEM_IMAGE_ID_MAP"))
    item_aliases = string_map(object_block(source, "ITEM_IMAGE_ID_MAP", "function resolveItemImageId"))
    ui_icons = string_map(object_block(source, "UI_ICON_MAP", "type LoadPriority"))
    building_frames = object_keys(
        object_block(source, "BUILDING_SHEET_FRAMES", "const UI_SHEET_FRAMES")
    )

    requested: dict[str, list[str]] = {}
    staged_crops: dict[str, str] = {}
    for key, category in categories.items():
        image_id = item_aliases.get(key, key)
        stage = re.fullmatch(r"(.+)_stage_[123]", image_id)
        if image_id in building_frames:
            relative = "textures/items/Buildings/item_buildings_sheet.png"
        else:
            asset_id = f"{stage.group(1)}_stages" if stage else image_id
            relative = f"textures/items/{category}/item_{asset_id}.png"
        requested.setdefault(relative, []).append(f"item:{key}")
        if stage:
            staged_crops.setdefault(stage.group(1), category)

    # Farm and building interiors request seasonal stage sheets on demand.
    # They are constructed as `${crop}_stage_${stage}_${season}` at runtime,
    # so those paths are not present as string literals in CATEGORY_MAP.
    for crop_id, category in staged_crops.items():
        for season in SEASONS:
            relative = (
                f"textures/items/{category}/item_{crop_id}_stages_{season}.png"
            )
            requested.setdefault(relative, []).append(
                f"item-dynamic:{crop_id}_stage_*_{season}"
            )

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
    support_files = sorted(
        path.relative_to(ASSETS).as_posix()
        for path in ASSETS.rglob("*")
        if path.is_file() and path.suffix.lower() != ".png"
    )
    empty_directories = sorted(
        path.relative_to(ASSETS).as_posix()
        for path in ASSETS.rglob("*")
        if path.is_dir() and not any(path.iterdir())
    )

    print(f"item keys: {len(categories)}")
    print(f"ui keys: {len(ui_icons)}")
    print(f"unique runtime PNG paths: {len(requested)}")
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

    print(f"non-PNG support files: {len(support_files)}")
    for relative in support_files:
        print(f"SUPPORT_FILE {relative}")

    if args.json_out:
        report = {
            "imageCache": str(args.image_cache),
            "itemKeyCount": len(categories),
            "uiKeyCount": len(ui_icons),
            "runtimePngPathCount": len(requested),
            "runtimePaths": [
                {"path": relative, "callers": callers}
                for relative, callers in sorted(requested.items())
            ],
            "missingRuntimePaths": [
                {"path": relative, "callers": callers}
                for relative, callers in missing
            ],
            "httpFailures": [
                {"url": url, "reason": str(reason)}
                for url, reason in http_failures
            ],
            "unreferencedPngCount": len(unreferenced),
            "unreferencedPngs": unreferenced,
            "supportFiles": support_files,
            "emptyDirectories": empty_directories,
        }
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"JSON report: {args.json_out}")

    return 1 if missing or http_failures else 0


if __name__ == "__main__":
    sys.exit(main())
