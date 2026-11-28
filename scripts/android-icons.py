#!/usr/bin/env python3
"""Write Android launcher and splash images from the club crest into a res/ directory."""

import sys
from pathlib import Path

from PIL import Image

BG = (11, 11, 11, 255)  # #0b0b0b
LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Adaptive icon foreground is 108dp. The crest must stay inside the 66dp safe zone.
FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
SPLASH_PORT = {
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}
SPLASH_LAND = {
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}


def crest_only(source: Image.Image) -> Image.Image:
    """Drop the pure-black backdrop so the crest can sit on the launcher background."""
    image = source.convert("RGBA")
    pixels = image.getdata()
    cleaned = []
    for red, green, blue, alpha in pixels:
        if red < 14 and green < 14 and blue < 14:
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((red, green, blue, alpha))
    image.putdata(cleaned)
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    return image


def fit(crest: Image.Image, canvas: tuple[int, int], scale: float) -> Image.Image:
    width, height = canvas
    plate = Image.new("RGBA", canvas, BG)
    target = int(min(width, height) * scale)
    resized = crest.copy()
    resized.thumbnail((target, target), Image.Resampling.LANCZOS)
    left = (width - resized.width) // 2
    top = (height - resized.height) // 2
    plate.paste(resized, (left, top), resized)
    return plate


def circle(image: Image.Image) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    from PIL import ImageDraw

    ImageDraw.Draw(mask).ellipse((0, 0, image.width - 1, image.height - 1), fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(path, "PNG")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: android-icons.py RES_DIR CREST_PNG")
    res = Path(sys.argv[1])
    crest = crest_only(Image.open(sys.argv[2]))

    for folder, size in LEGACY.items():
        icon = fit(crest, (size, size), 0.86)
        save(icon, res / folder / "ic_launcher.png")
        save(circle(icon), res / folder / "ic_launcher_round.png")

    for folder, size in FOREGROUND.items():
        # 66/108 keeps the crest inside the adaptive-icon safe zone.
        save(fit(crest, (size, size), 66 / 108), res / folder / "ic_launcher_foreground.png")

    # Keep the whole crest, plume included, inside the Android 12 circular splash mask.
    for folder, size in {**SPLASH_PORT, **SPLASH_LAND}.items():
        save(fit(crest, size, 0.58), res / folder / "splash.png")
    save(fit(crest, (480, 800), 0.58), res / "drawable" / "splash.png")
    save(fit(crest, (432, 432), 0.62), res / "drawable" / "splash_icon.png")

    anydpi = res / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    adaptive = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""
    (anydpi / "ic_launcher.xml").write_text(adaptive, encoding="utf-8")
    (anydpi / "ic_launcher_round.xml").write_text(adaptive, encoding="utf-8")
    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B0B0B</color>
</resources>
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
