"""Generate FlipFlow extension icons at 16, 48, and 128px.
Uses a recycling-arrows motif with a gradient background.
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def draw_icon(size):
    """Draw a FlipFlow icon at the given pixel size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # rounded-rect background with gradient effect
    # We'll draw two overlapping rects to fake a gradient
    margin = max(1, size // 16)
    radius = max(2, size // 6)

    # bottom layer — darker purple
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(79, 70, 229, 255),
    )

    # top gradient overlay — lighter at top-left
    for i in range(size // 2):
        alpha = int(80 * (1 - i / (size / 2)))
        draw.line(
            [(margin + i, margin), (margin, margin + i)],
            fill=(255, 255, 255, alpha),
            width=1,
        )

    # draw two curved arrows (recycling / cross-post arrows)
    center = size / 2
    arrow_r = size * 0.28
    stroke_w = max(1, size // 12)

    if size >= 48:
        # top-right arrow arc
        bbox_tr = [
            center - arrow_r,
            center - arrow_r - size * 0.08,
            center + arrow_r,
            center + arrow_r - size * 0.08,
        ]
        draw.arc(bbox_tr, start=200, end=340, fill=(255, 255, 255, 240), width=stroke_w)
        # arrowhead
        ax = center + arrow_r * 0.75
        ay = center - arrow_r * 0.45
        aw = max(2, size // 10)
        draw.polygon(
            [(ax, ay - aw), (ax + aw, ay), (ax, ay + aw)],
            fill=(255, 255, 255, 240),
        )

        # bottom-left arrow arc
        bbox_bl = [
            center - arrow_r,
            center - arrow_r + size * 0.08,
            center + arrow_r,
            center + arrow_r + size * 0.08,
        ]
        draw.arc(bbox_bl, start=20, end=160, fill=(255, 255, 255, 240), width=stroke_w)
        # arrowhead
        bx = center - arrow_r * 0.75
        by = center + arrow_r * 0.45
        draw.polygon(
            [(bx, by - aw), (bx - aw, by), (bx, by + aw)],
            fill=(255, 255, 255, 240),
        )
    else:
        # for 16px just draw "FF" text
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", max(7, size // 2))
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), "FF", font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(
            (center - tw / 2, center - th / 2 - 1),
            "FF",
            fill=(255, 255, 255, 240),
            font=font,
        )

    return img


if __name__ == "__main__":
    for s in SIZES:
        icon = draw_icon(s)
        path = os.path.join(OUT_DIR, f"icon{s}.png")
        icon.save(path)
        print(f"  Created {path}")
    print("Done.")
