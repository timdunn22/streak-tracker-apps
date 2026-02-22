"""
LeadHarvest — Icon Generator
Generates extension icons using Pillow.
Creates a magnifying glass + map pin icon in gradient colors.
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

SIZES = [16, 48, 128]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")


def lerp_color(c1, c2, t):
    """Linearly interpolate between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def create_icon(size):
    """Create a single icon at the given size."""
    # Use 4x supersampling for antialiasing
    ss = 4
    canvas_size = size * ss
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    cyan = (0, 210, 255)
    purple = (123, 47, 247)
    dark_bg = (26, 26, 46)

    # Draw rounded rectangle background with gradient
    margin = int(canvas_size * 0.06)
    radius = int(canvas_size * 0.2)

    # Background rounded rect
    draw.rounded_rectangle(
        [margin, margin, canvas_size - margin, canvas_size - margin],
        radius=radius,
        fill=dark_bg,
    )

    # Draw a gradient overlay on the background
    for y in range(margin, canvas_size - margin):
        t = (y - margin) / max(1, (canvas_size - 2 * margin))
        color = lerp_color(cyan, purple, t)
        alpha = int(40 + 30 * t)
        for x in range(margin, canvas_size - margin):
            px = img.getpixel((x, y))
            if px[3] > 0:
                blended = tuple(
                    int(px[i] * (255 - alpha) / 255 + color[i] * alpha / 255)
                    for i in range(3)
                )
                img.putpixel((x, y), (*blended, 255))

    cx = canvas_size // 2
    cy = canvas_size // 2

    # ---- Draw Map Pin ----
    pin_cx = cx + int(canvas_size * 0.08)
    pin_top = int(canvas_size * 0.18)
    pin_radius = int(canvas_size * 0.16)
    pin_bottom = int(canvas_size * 0.72)

    # Pin head (circle)
    draw.ellipse(
        [
            pin_cx - pin_radius,
            pin_top,
            pin_cx + pin_radius,
            pin_top + pin_radius * 2,
        ],
        fill=purple,
        outline=None,
    )

    # Pin point (triangle)
    pin_center_y = pin_top + pin_radius
    draw.polygon(
        [
            (pin_cx - int(pin_radius * 0.6), pin_center_y + int(pin_radius * 0.3)),
            (pin_cx + int(pin_radius * 0.6), pin_center_y + int(pin_radius * 0.3)),
            (pin_cx, pin_bottom),
        ],
        fill=purple,
    )

    # Pin inner circle (white dot)
    inner_r = int(pin_radius * 0.4)
    draw.ellipse(
        [
            pin_cx - inner_r,
            pin_center_y - inner_r,
            pin_cx + inner_r,
            pin_center_y + inner_r,
        ],
        fill=(255, 255, 255, 230),
    )

    # ---- Draw Magnifying Glass ----
    mag_cx = cx - int(canvas_size * 0.1)
    mag_cy = cy - int(canvas_size * 0.05)
    mag_radius = int(canvas_size * 0.18)
    ring_width = max(int(canvas_size * 0.04), 2)

    # Glass circle (ring)
    draw.ellipse(
        [
            mag_cx - mag_radius,
            mag_cy - mag_radius,
            mag_cx + mag_radius,
            mag_cy + mag_radius,
        ],
        fill=None,
        outline=cyan,
        width=ring_width,
    )

    # Glass handle
    handle_start_x = mag_cx + int(mag_radius * 0.7)
    handle_start_y = mag_cy + int(mag_radius * 0.7)
    handle_end_x = handle_start_x + int(canvas_size * 0.15)
    handle_end_y = handle_start_y + int(canvas_size * 0.15)
    handle_width = max(int(canvas_size * 0.05), 2)

    draw.line(
        [(handle_start_x, handle_start_y), (handle_end_x, handle_end_y)],
        fill=cyan,
        width=handle_width,
    )

    # Round handle end cap
    cap_r = handle_width // 2
    draw.ellipse(
        [
            handle_end_x - cap_r,
            handle_end_y - cap_r,
            handle_end_x + cap_r,
            handle_end_y + cap_r,
        ],
        fill=cyan,
    )

    # Downsample with antialiasing
    img = img.resize((size, size), Image.LANCZOS)
    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for size in SIZES:
        icon = create_icon(size)
        path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
        icon.save(path, "PNG")
        print(f"Generated {path} ({size}x{size})")

    print("All icons generated successfully.")


if __name__ == "__main__":
    main()
