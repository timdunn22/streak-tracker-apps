"""
Generate EtsyRank Pro icons — magnifying glass + shop/storefront icon
Sizes: 16x16, 48x48, 128x128
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors
BG_TOP = (245, 114, 36)      # orange gradient top
BG_BOTTOM = (224, 79, 26)    # orange gradient bottom
WHITE = (255, 255, 255)
SHADOW = (180, 60, 10, 80)


def draw_icon(size):
    """Draw a combined magnifying-glass + shop-roof icon on an orange circle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle with gradient feel (concentric circles)
    cx, cy = size // 2, size // 2
    r = size // 2
    for i in range(r):
        ratio = i / max(r, 1)
        color = tuple(
            int(BG_TOP[j] + (BG_BOTTOM[j] - BG_TOP[j]) * ratio) for j in range(3)
        )
        draw.ellipse(
            [cx - r + i, cy - r + i, cx + r - i, cy + r - i],
            fill=color,
        )

    # Scale factor
    s = size / 128.0

    # --- Draw magnifying glass ---
    # Glass circle
    glass_cx = int(48 * s)
    glass_cy = int(46 * s)
    glass_r = int(22 * s)
    lw = max(1, int(5 * s))

    draw.ellipse(
        [glass_cx - glass_r, glass_cy - glass_r,
         glass_cx + glass_r, glass_cy + glass_r],
        outline=WHITE,
        width=lw,
    )

    # Glass handle
    hx1 = int(glass_cx + glass_r * 0.7)
    hy1 = int(glass_cy + glass_r * 0.7)
    hx2 = int(hx1 + 20 * s)
    hy2 = int(hy1 + 20 * s)
    draw.line([hx1, hy1, hx2, hy2], fill=WHITE, width=max(1, int(6 * s)))

    # --- Draw shop roof (small) inside glass ---
    roof_cx = glass_cx
    roof_top = int(glass_cy - 10 * s)
    roof_w = int(16 * s)
    roof_h = int(8 * s)
    roof_lw = max(1, int(2.5 * s))

    # Roof triangle
    draw.polygon(
        [
            (roof_cx, roof_top),
            (roof_cx - roof_w // 2, roof_top + roof_h),
            (roof_cx + roof_w // 2, roof_top + roof_h),
        ],
        outline=WHITE,
        width=roof_lw,
    )
    # Fill roof
    draw.polygon(
        [
            (roof_cx, roof_top + roof_lw),
            (roof_cx - roof_w // 2 + roof_lw, roof_top + roof_h),
            (roof_cx + roof_w // 2 - roof_lw, roof_top + roof_h),
        ],
        fill=(255, 255, 255, 180),
    )

    # Shop body (small rectangle under roof)
    body_top = roof_top + roof_h
    body_bottom = int(body_top + 10 * s)
    body_left = roof_cx - roof_w // 2
    body_right = roof_cx + roof_w // 2
    draw.rectangle(
        [body_left, body_top, body_right, body_bottom],
        outline=WHITE,
        width=max(1, int(2 * s)),
    )

    # Door (small rectangle in center)
    door_w = int(5 * s)
    door_h = int(6 * s)
    draw.rectangle(
        [
            roof_cx - door_w // 2,
            body_bottom - door_h,
            roof_cx + door_w // 2,
            body_bottom,
        ],
        fill=WHITE,
    )

    # --- "SEO" text or bar chart on right side for larger sizes ---
    if size >= 48:
        bar_x = int(78 * s)
        bar_bottom = int(90 * s)
        bar_w = max(2, int(6 * s))
        bar_gap = max(1, int(4 * s))

        heights = [int(20 * s), int(32 * s), int(44 * s)]
        for i, h in enumerate(heights):
            x = bar_x + i * (bar_w + bar_gap)
            draw.rectangle(
                [x, bar_bottom - h, x + bar_w, bar_bottom],
                fill=WHITE,
            )

        # Upward arrow above tallest bar
        arrow_x = bar_x + 2 * (bar_w + bar_gap) + bar_w // 2
        arrow_top = bar_bottom - heights[2] - int(8 * s)
        arrow_size = max(2, int(5 * s))
        draw.polygon(
            [
                (arrow_x, arrow_top),
                (arrow_x - arrow_size, arrow_top + arrow_size),
                (arrow_x + arrow_size, arrow_top + arrow_size),
            ],
            fill=WHITE,
        )

    return img


for size in SIZES:
    icon = draw_icon(size)
    path = os.path.join(OUT_DIR, f"icon{size}.png")
    icon.save(path, "PNG")
    print(f"Created {path}")

print("All icons generated.")
