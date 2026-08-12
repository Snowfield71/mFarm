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


def draw_tab_state(selected_index: int) -> Image.Image:
    # Match the native task/inventory/achievement tab artwork: transparent
    # selected cell, pale parchment gradient on inactive cells, thin ochre
    # contour, low profile, and no glossy inset decoration.
    scale = 4
    width, height = TAB_WIDTH * scale, TAB_HEIGHT * scale
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    border = (169, 109, 45, 255)
    x_ranges = [(48, 371), (381, 704), (714, 1037)]
    top, baseline, radius = 27, 154, 20

    gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gradient_pixels = gradient.load()
    for y in range(top * scale, (baseline + 1) * scale):
        t = (y / scale - top) / (baseline - top)
        color = tuple(
            round(a + (b - a) * t)
            for a, b in zip((243, 214, 170, 255), (233, 193, 139, 255))
        )
        for x in range(width):
            gradient_pixels[x, y] = color

    for index, (base_x0, base_x1) in enumerate(x_ranges):
        x0, x1 = base_x0 * scale, base_x1 * scale
        y0, y1, r = top * scale, baseline * scale, radius * scale
        if index != selected_index:
            mask = Image.new("L", (width, height), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle(
                (x0, y0, x1, y1 + r), radius=r, fill=255
            )
            mask_draw.rectangle((x0, y0 + r, x1, y1), fill=255)
            image.alpha_composite(Image.composite(gradient, Image.new("RGBA", image.size), mask))

        points: list[tuple[int, int]] = [(x0, y1), (x0, y0 + r)]
        for step in range(9):
            angle = math.pi + (math.pi / 2) * step / 8
            points.append(
                (
                    round(x0 + r + math.cos(angle) * r),
                    round(y0 + r + math.sin(angle) * r),
                )
            )
        points.append((x1 - r, y0))
        for step in range(9):
            angle = -math.pi / 2 + (math.pi / 2) * step / 8
            points.append(
                (
                    round(x1 - r + math.cos(angle) * r),
                    round(y0 + r + math.sin(angle) * r),
                )
            )
        points.append((x1, y1))
        ImageDraw.Draw(image).line(
            points, fill=border, width=7 * scale, joint="curve"
        )

    draw = ImageDraw.Draw(image)
    selected_x0, selected_x1 = x_ranges[selected_index]
    draw.line(
        (0, baseline * scale, selected_x0 * scale, baseline * scale),
        fill=border,
        width=7 * scale,
    )
    draw.line(
        (selected_x1 * scale, baseline * scale, width, baseline * scale),
        fill=border,
        width=7 * scale,
    )
    return image.resize((TAB_WIDTH, TAB_HEIGHT), Image.Resampling.LANCZOS)


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

    tab_sheet = Image.new("RGBA", (TAB_WIDTH * 3, TAB_HEIGHT), (0, 0, 0, 0))
    for index in range(3):
        tab_sheet.alpha_composite(draw_tab_state(index), (index * TAB_WIDTH, 0))
    args.tabs_output.parent.mkdir(parents=True, exist_ok=True)
    tab_sheet.save(args.tabs_output, optimize=True)


if __name__ == "__main__":
    main()
