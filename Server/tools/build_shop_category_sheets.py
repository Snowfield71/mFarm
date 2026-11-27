from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw


TAB_WIDTH = 1086
TAB_HEIGHT = 181
ICON_CELL = 256


def fit_icon(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    bbox = source.getbbox()
    if bbox is None:
        raise ValueError(f"icon has no visible pixels: {path}")
    icon = source.crop(bbox)
    icon.thumbnail((232, 232), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (ICON_CELL, ICON_CELL), (0, 0, 0, 0))
    cell.alpha_composite(icon, ((ICON_CELL - icon.width) // 2, (ICON_CELL - icon.height) // 2))
    return cell


TAB_X_RANGES = [(48, 371), (381, 704), (714, 1037)]
TAB_TOP = 27
TAB_BASELINE = 154
TAB_TOP_RADIUS = 20
TAB_FOOT_RADIUS = 22
TAB_STROKE = 7


def _arc(cx: int, cy: int, radius: int, angle_from: float, angle_to: float) -> list[tuple[int, int]]:
    return [
        (
            round(cx + radius * math.cos(math.radians(angle_from + t * (angle_to - angle_from)))),
            round(cy + radius * math.sin(math.radians(angle_from + t * (angle_to - angle_from)))),
        )
        for t in (step / 24 for step in range(25))
    ]


def draw_tab_state(selected_index: int) -> Image.Image:
    # Inactive tabs have four real corners. The selected one remains open to
    # the list, with one continuous outline that rolls onto the bottom rule.
    scale = 4
    width, height = TAB_WIDTH * scale, TAB_HEIGHT * scale
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    border = (169, 109, 45, 255)
    radius = TAB_TOP_RADIUS * scale
    bottom_radius = TAB_FOOT_RADIUS * scale
    top, baseline = TAB_TOP * scale, TAB_BASELINE * scale
    stroke = TAB_STROKE * scale

    gradient = Image.new("RGBA", image.size, (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(gradient)
    for y in range(top, baseline + 1):
        t = (y - top) / (baseline - top)
        color = tuple(round(a + (b - a) * t) for a, b in zip((243, 214, 170, 255), (233, 193, 139, 255)))
        grad_draw.line((0, y, width - 1, y), fill=color)
    for index, (lo, hi) in enumerate(TAB_X_RANGES):
        if index == selected_index:
            continue
        # Trace the centerline at the same coordinates as the selected stem.
        left, right = lo * scale, hi * scale
        mask = Image.new("L", image.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((left, top, right, baseline), radius=radius, fill=255)
        image.alpha_composite(Image.composite(gradient, Image.new("RGBA", image.size), mask))
        points = [
            *_arc(left + radius, top + radius, radius, 180, 270),
            *_arc(right - radius, top + radius, radius, 270, 360),
            *_arc(right - radius, baseline - radius, radius, 0, 90),
            *_arc(left + radius, baseline - radius, radius, 90, 180),
        ]
        points.append(points[0])
        ImageDraw.Draw(image).line(points, fill=border, width=stroke, joint="curve")

    left, right = (n * scale for n in TAB_X_RANGES[selected_index])
    # Concave quarter arcs meet the stem vertically and the ruled line horizontally.
    # Keeping the complete rail in this path prevents broken butt joints and seams.
    path = [
        (0, baseline),
        *_arc(left - bottom_radius, baseline - bottom_radius, bottom_radius, 90, 0),
        *_arc(left + radius, top + radius, radius, 180, 270),
        *_arc(right - radius, top + radius, radius, 270, 360),
        *_arc(right + bottom_radius, baseline - bottom_radius, bottom_radius, 180, 90),
        (width - 1, baseline),
    ]
    ImageDraw.Draw(image).line(path, fill=border, width=stroke, joint="curve")
    return image.resize((TAB_WIDTH, TAB_HEIGHT), Image.Resampling.LANCZOS)


def build_tab_sheet() -> Image.Image:
    sheet = Image.new("RGBA", (TAB_WIDTH * 3, TAB_HEIGHT), (0, 0, 0, 0))
    for i in range(3):
        sheet.alpha_composite(draw_tab_state(i), (i * TAB_WIDTH, 0))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds-icon", type=Path, required=True)
    parser.add_argument("--tools-icon", type=Path, required=True)
    parser.add_argument("--buildings-icon", type=Path, required=True)
    parser.add_argument("--tabs-output", type=Path, required=True)
    parser.add_argument("--icons-output", type=Path, required=True)
    parser.add_argument("--buildings-output", type=Path)
    args = parser.parse_args()

    icons = [
        fit_icon(args.seeds_icon),
        fit_icon(args.tools_icon),
        fit_icon(args.buildings_icon),
    ]
    icon_sheet = Image.new("RGBA", (ICON_CELL * 3, ICON_CELL), (0, 0, 0, 0))
    for index, icon in enumerate(icons):
        icon_sheet.alpha_composite(icon, (index * ICON_CELL, 0))
    args.icons_output.parent.mkdir(parents=True, exist_ok=True)
    icon_sheet.save(args.icons_output, optimize=True)

    if args.buildings_output:
        args.buildings_output.parent.mkdir(parents=True, exist_ok=True)
        icons[2].save(args.buildings_output, optimize=True)

    args.tabs_output.parent.mkdir(parents=True, exist_ok=True)
    build_tab_sheet().save(args.tabs_output, optimize=True)


if __name__ == "__main__":
    main()
