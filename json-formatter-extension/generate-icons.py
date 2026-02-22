#!/usr/bin/env python3
"""Generate extension icons using Pillow."""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors
BG_COLOR = (122, 162, 247)       # #7aa2f7 blue
TEXT_COLOR = (26, 27, 38)         # #1a1b26 dark
RING_COLOR = (187, 154, 247)     # #bb9af7 purple

for size in SIZES:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw circle background
    padding = max(1, size // 16)
    draw.ellipse([padding, padding, size - padding - 1, size - padding - 1], fill=BG_COLOR)

    # Draw ring
    ring_width = max(1, size // 16)
    draw.ellipse(
        [padding, padding, size - padding - 1, size - padding - 1],
        outline=RING_COLOR,
        width=ring_width,
    )

    # Draw "{}" text
    font_size = int(size * 0.5)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", font_size)
    except (IOError, OSError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", font_size)
        except (IOError, OSError):
            font = ImageFont.load_default()

    text = "{}"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1]
    draw.text((tx, ty), text, fill=TEXT_COLOR, font=font)

    path = os.path.join(OUT_DIR, f"icon{size}.png")
    img.save(path)
    print(f"Created {path} ({size}x{size})")

print("Done!")
