"""Build palette-aligned three-stage crop sprite sheets.

Each output is 1536 x 512 and contains stage_1, stage_2, stage_3 from left to
right. Source files remain untouched so they can be used as a fallback.
"""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ITEMS_ROOT = ROOT / "assets" / "textures" / "items"
CATEGORIES = ("Vegetables", "Fruits")
CELL_SIZE = 512
BASELINE_Y = 480

# Median hue of the approved tomato/corn/carrot family. Existing leaf hue is
# blended toward it instead of being flattened to one literal RGB value.
TARGET_GREEN_HUE = 78.5
TARGET_GREEN_SATURATION = 0.84
HUE_BLEND = 0.85
SATURATION_BLEND = 0.55


def align_green_family(image: Image.Image) -> Image.Image:
    """Align green pixels while preserving value, alpha, and non-green art."""
    rgba = image.convert("RGBA")
    output: list[tuple[int, int, int, int]] = []
    for red, green, blue, alpha in rgba.getdata():
        # Detect foliage by color instead of by canvas height.  The previous
        # y < 440 guard also excluded low leaves and ground-hugging vines,
        # leaving a visible strip of the old palette near the baseline.
        if alpha and green > red * 1.05 and green > blue * 1.20:
            hue, saturation, value = colorsys.rgb_to_hsv(
                red / 255,
                green / 255,
                blue / 255,
            )
            hue_degrees = hue * 360
            if (
                55 <= hue_degrees <= 155
                and saturation >= 0.25
                and value >= 0.25
            ):
                hue_degrees += (
                    TARGET_GREEN_HUE - hue_degrees
                ) * HUE_BLEND
                target_saturation = (
                    TARGET_GREEN_SATURATION if saturation >= 0.5 else 0.68
                )
                saturation += (
                    target_saturation - saturation
                ) * SATURATION_BLEND
                new_red, new_green, new_blue = colorsys.hsv_to_rgb(
                    hue_degrees / 360,
                    saturation,
                    value,
                )
                red = round(new_red * 255)
                green = round(new_green * 255)
                blue = round(new_blue * 255)
        output.append((red, green, blue, alpha))

    result = Image.new("RGBA", rgba.size)
    result.putdata(output)
    return result


def validate_source(path: Path, image: Image.Image) -> None:
    if image.size != (CELL_SIZE, CELL_SIZE):
        raise ValueError(f"{path}: expected 512x512, got {image.size}")
    bounds = image.getchannel("A").getbbox()
    if bounds is None or bounds[3] != BASELINE_Y:
        raise ValueError(f"{path}: expected alpha bottom 480, got {bounds}")


def build_sheet(crop_directory: Path) -> Path | None:
    crop = crop_directory.name
    sources = [
        crop_directory / f"item_{crop}_stage_{stage}.png"
        for stage in (1, 2, 3)
    ]
    if not all(path.exists() for path in sources):
        return None

    sheet = Image.new("RGBA", (CELL_SIZE * 3, CELL_SIZE), (0, 0, 0, 0))
    for index, path in enumerate(sources):
        original = Image.open(path).convert("RGBA")
        validate_source(path, original)
        aligned = align_green_family(original)

        # Palette alignment must never alter transparency or the brown contact
        # shadow. Brown pixels are outside the selected green hue interval.
        if aligned.getchannel("A").tobytes() != original.getchannel("A").tobytes():
            raise ValueError(f"{path}: alpha changed during palette alignment")
        for y in range(440, CELL_SIZE):
            for x in range(CELL_SIZE):
                before = original.getpixel((x, y))
                if (
                    before[3] > 0
                    and before[0] > before[1]
                    and before[1] >= before[2]
                    and before[0] < 180
                    and aligned.getpixel((x, y)) != before
                ):
                    raise ValueError(f"{path}: contact-shadow pixel changed")

        sheet.alpha_composite(aligned, (index * CELL_SIZE, 0))

    output = crop_directory / f"item_{crop}_stages.png"
    sheet.save(output, optimize=True)
    return output


def main() -> None:
    outputs: list[Path] = []
    for category in CATEGORIES:
        category_root = ITEMS_ROOT / category
        for crop_directory in sorted(
            path for path in category_root.iterdir() if path.is_dir()
        ):
            output = build_sheet(crop_directory)
            if output:
                outputs.append(output)
                print(output.relative_to(ROOT))
    print(f"built={len(outputs)}")


if __name__ == "__main__":
    main()
