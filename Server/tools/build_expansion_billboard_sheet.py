from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


CELL_SIZE = 256
LABEL = "扩建"


def remove_connected_checkerboard(source: Image.Image) -> Image.Image:
    """Remove a baked light-gray checkerboard without touching enclosed label fill."""
    image = source.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def removable(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return max(r, g, b) - min(r, g, b) <= 14 and (r + g + b) / 3 >= 178

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        offset = y * width + x
        if visited[offset] or not removable(x, y):
            continue
        visited[offset] = 1
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    # The generated reference may close the checkerboard between the two posts
    # with its old ground shadow. Clear neutral pixels in that lower prop zone;
    # the wooden posts are saturated brown and remain intact.
    lower_start = int(height * 0.66)
    warm_mask = Image.new("L", image.size, 0)
    warm_pixels = warm_mask.load()
    post_candidate_start = int(height * 0.72)
    for y in range(post_candidate_start, height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a and r > g >= b and r - b >= 30:
                warm_pixels[x, y] = 255
    post_neighborhood = warm_mask.filter(ImageFilter.MaxFilter(15)).load()
    for y in range(lower_start, height):
        for x in range(width):
            if not post_neighborhood[x, y]:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def fit_cell(source: Image.Image) -> Image.Image:
    bbox = source.getbbox()
    if bbox is None:
        raise ValueError("sprite cell has no visible pixels")
    sprite = source.crop(bbox)
    sprite.thumbnail((248, 238), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    shadow = Image.new("RGBA", cell.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_width = min(190, int(sprite.width * 0.72))
    shadow_draw.ellipse(
        (
            (CELL_SIZE - shadow_width) // 2,
            238,
            (CELL_SIZE + shadow_width) // 2,
            249,
        ),
        fill=(91, 69, 49, 92),
    )
    cell.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(3.2)))
    cell.alpha_composite(sprite, ((CELL_SIZE - sprite.width) // 2, 246 - sprite.height))
    return cell


def draw_label(cell: Image.Image, font_path: Path) -> None:
    draw = ImageDraw.Draw(cell)
    font = ImageFont.truetype(str(font_path), 48)
    box = draw.textbbox((0, 0), LABEL, font=font, stroke_width=3)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text(
        ((CELL_SIZE - width) / 2, 116 - height / 2 - box[1]),
        LABEL,
        font=font,
        fill=(255, 249, 220, 255),
        stroke_width=5,
        stroke_fill=(91, 48, 23, 255),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--farm-output", type=Path)
    parser.add_argument("--pasture-output", type=Path)
    parser.add_argument("--checkerboard-background", action="store_true")
    parser.add_argument("--source-has-label", action="store_true")
    parser.add_argument(
        "--font",
        type=Path,
        default=Path("C:/Windows/Fonts/msyhbd.ttc"),
    )
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    if args.checkerboard_background:
        source = remove_connected_checkerboard(source)
    midpoint = source.width // 2
    cells = [
        fit_cell(source.crop((0, 0, midpoint, source.height))),
        fit_cell(source.crop((midpoint, 0, source.width, source.height))),
    ]
    if not args.source_has_label:
        for cell in cells:
            draw_label(cell, args.font)

    sheet = Image.new("RGBA", (CELL_SIZE * 2, CELL_SIZE), (0, 0, 0, 0))
    sheet.alpha_composite(cells[0], (0, 0))
    sheet.alpha_composite(cells[1], (CELL_SIZE, 0))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, optimize=True)
    for cell, output in zip(cells, (args.farm_output, args.pasture_output)):
        if output is None:
            continue
        output.parent.mkdir(parents=True, exist_ok=True)
        cell.save(output, optimize=True)


if __name__ == "__main__":
    main()
