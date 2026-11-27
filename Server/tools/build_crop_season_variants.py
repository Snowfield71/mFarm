"""Bake per-season crop stage sheets without runtime color filters.

The source artwork, alpha, outlines, contact shadows, centering and y=480
baseline remain unchanged.  Only foliage color planes inside existing opaque
pixels receive a restrained seasonal treatment.  Every configured season gets
its own physical PNG so individual crops can later be hand-redrawn without
changing the client contract.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ITEMS = ROOT / "Server" / "assets" / "textures" / "items"
CONFIG = ROOT / "Web" / "assets" / "scripts" / "config" / "ItemConfig.ts"
SEASONS = ("spring", "summer", "autumn", "winter")


def configured_crop_seasons() -> dict[str, list[str]]:
    source = CONFIG.read_text(encoding="utf-8")
    result: dict[str, list[str]] = {}
    pattern = re.compile(
        r'id:\s*"(?P<id>[A-Za-z]+)"(?P<body>[\s\S]{0,420}?)'
        r'seasons:\s*\[(?P<seasons>[^\]]+)\]',
    )
    for match in pattern.finditer(source):
        crop_id = match.group("id")
        if crop_id.startswith("seed") or crop_id in result:
            continue
        seasons = re.findall(r'"(spring|summer|autumn|winter)"', match.group("seasons"))
        if seasons:
            result[crop_id] = seasons
    return result


def foliage_mask(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., index].astype(np.float32) for index in range(3))
    return (
        (alpha > 16)
        & (g > 58)
        & (g > r * 0.88)
        & (g > b * 1.12)
        & ((g - np.minimum(r, b)) > 16)
    )


def top_edge(mask: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    transparent_above = np.zeros_like(mask)
    for distance in (1, 2, 3):
        shifted = np.zeros_like(mask)
        shifted[distance:, :] = alpha[:-distance, :] < 16
        transparent_above |= shifted
    return mask & transparent_above


def seasonize(source: Image.Image, season: str) -> Image.Image:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[..., :3].astype(np.float32)
    alpha = rgba[..., 3]
    green = foliage_mask(rgb, alpha)

    if season == "summer":
        rgb[..., 0][green] *= 1.03
        rgb[..., 1][green] *= 0.97
        rgb[..., 2][green] *= 0.88
    elif season == "autumn":
        old_r = rgb[..., 0][green].copy()
        old_g = rgb[..., 1][green].copy()
        old_b = rgb[..., 2][green].copy()
        rgb[..., 0][green] = old_r * 0.72 + old_g * 0.28
        rgb[..., 1][green] = old_g * 0.88 + old_r * 0.05
        rgb[..., 2][green] = old_b * 0.72
    elif season == "winter":
        old = rgb[green].copy()
        rgb[..., 0][green] = old[:, 0] * 0.78 + 34
        rgb[..., 1][green] = old[:, 1] * 0.82 + 28
        rgb[..., 2][green] = old[:, 2] * 0.78 + 54
        frost = top_edge(green, alpha)
        rgb[frost] = rgb[frost] * 0.48 + np.array([225, 241, 242]) * 0.52

    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def alpha_bbox_per_stage(image: Image.Image) -> list[tuple[int, int, int, int] | None]:
    return [
        image.crop((stage * 512, 0, (stage + 1) * 512, 512)).getchannel("A").getbbox()
        for stage in range(3)
    ]


def main() -> None:
    configured = configured_crop_seasons()
    manifest: dict[str, object] = {"version": 1, "crops": {}}
    generated = 0

    for base in sorted(ITEMS.glob("**/item_*_stages.png")):
        crop_id = base.name[len("item_") : -len("_stages.png")]
        configured_seasons = configured.get(crop_id)
        if not configured_seasons:
            continue
        source = Image.open(base).convert("RGBA")
        if source.size != (1536, 512):
            raise ValueError(f"Unexpected sheet size: {base} {source.size}")
        baseline = alpha_bbox_per_stage(source)
        outputs: dict[str, str] = {}
        for season in SEASONS:
            result = seasonize(source, season)
            if alpha_bbox_per_stage(result) != baseline:
                raise ValueError(f"Alpha/baseline changed for {crop_id}/{season}")
            destination = base.with_name(f"item_{crop_id}_stages_{season}.png")
            result.save(destination, optimize=True)
            outputs[season] = destination.relative_to(ITEMS).as_posix()
            generated += 1
        manifest["crops"][crop_id] = {
            "configuredSeasons": configured_seasons,
            "variants": list(SEASONS),
            "source": base.relative_to(ITEMS).as_posix(),
            "outputs": outputs,
            "stageAlphaBounds": baseline,
        }

    manifest_path = ITEMS / "crop_season_variants_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {generated} seasonal crop sheets for {len(manifest['crops'])} crops")
    print(manifest_path)


if __name__ == "__main__":
    main()
