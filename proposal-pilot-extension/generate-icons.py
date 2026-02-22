"""
ProposalPilot — Icon Generator
Generates 16x16, 48x48, and 128x128 PNG icons
Rocket/arrow design with Upwork-green palette
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Colors
GREEN = (20, 168, 0)         # #14a800 — Upwork green
DARK_GREEN = (14, 140, 0)    # #0e8c00
WHITE = (255, 255, 255)
BG_START = (20, 168, 0)
BG_END = (10, 120, 0)


def generate_icon(size):
    """Generate a rocket/arrow icon at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-rect background with gradient feel
    padding = max(1, size // 16)
    radius = max(2, size // 5)

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [padding, padding, size - padding - 1, size - padding - 1],
        radius=radius,
        fill=GREEN,
    )

    # Draw an upward-right arrow (proposal launch) in white
    cx, cy = size / 2, size / 2
    margin = size * 0.22

    if size <= 16:
        # Simple arrow for tiny icon
        arrow_points = [
            (margin, size - margin),          # bottom-left
            (size - margin, margin),          # top-right (tip)
            (size - margin, cy),              # mid-right
        ]
        draw.polygon(arrow_points, fill=WHITE)
        # Vertical stem
        stem_w = max(1, size // 6)
        draw.rectangle(
            [margin, margin + size * 0.15, margin + stem_w, size - margin],
            fill=WHITE,
        )
    else:
        # Rocket / arrow body
        s = size
        # Arrow pointing up-right
        # Main arrow triangle
        tip_x = s * 0.78
        tip_y = s * 0.22
        base1_x = s * 0.22
        base1_y = s * 0.50
        base2_x = s * 0.50
        base2_y = s * 0.78

        draw.polygon(
            [(tip_x, tip_y), (base1_x, base1_y), (s * 0.38, s * 0.62), (base2_x, base2_y)],
            fill=WHITE,
        )

        # Arrow head (larger triangle)
        head_size = s * 0.30
        draw.polygon(
            [
                (tip_x, tip_y),
                (tip_x, tip_y + head_size),
                (tip_x - head_size, tip_y),
            ],
            fill=WHITE,
        )

        # Tail / exhaust lines
        line_w = max(1, int(s * 0.04))
        # Line 1
        draw.line(
            [(s * 0.18, s * 0.82), (s * 0.35, s * 0.65)],
            fill=WHITE,
            width=line_w,
        )
        # Line 2
        draw.line(
            [(s * 0.12, s * 0.72), (s * 0.25, s * 0.59)],
            fill=WHITE,
            width=line_w,
        )
        # Line 3
        draw.line(
            [(s * 0.28, s * 0.88), (s * 0.42, s * 0.72)],
            fill=WHITE,
            width=line_w,
        )

        # Small circle "window" on rocket body
        window_r = max(2, int(s * 0.05))
        window_cx = s * 0.52
        window_cy = s * 0.48
        draw.ellipse(
            [
                window_cx - window_r,
                window_cy - window_r,
                window_cx + window_r,
                window_cy + window_r,
            ],
            fill=GREEN,
        )

    return img


if __name__ == "__main__":
    for size in SIZES:
        icon = generate_icon(size)
        path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
        icon.save(path, "PNG")
        print(f"Generated {path} ({size}x{size})")
    print("Done.")
