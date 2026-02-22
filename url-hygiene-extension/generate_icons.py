from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

def draw_shield_icon(size):
    """Draw a shield icon with a checkmark, representing URL protection."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = size * 0.08
    w = size - 2 * margin
    h = size - 2 * margin

    cx = size / 2
    top = margin
    bottom = margin + h
    mid_y = top + h * 0.55

    # Shield outline points
    shield_points = [
        (cx, top),                          # top center
        (margin + w * 0.05, top + h * 0.12),  # upper left
        (margin, top + h * 0.2),            # left shoulder
        (margin, mid_y),                    # left mid
        (margin + w * 0.15, mid_y + h * 0.2),  # lower left
        (cx, bottom),                       # bottom point
        (margin + w * 0.85, mid_y + h * 0.2),  # lower right
        (margin + w, mid_y),                # right mid
        (margin + w, top + h * 0.2),        # right shoulder
        (margin + w * 0.95, top + h * 0.12),  # upper right
        (cx, top),                          # back to top
    ]

    # Fill shield with green
    draw.polygon(shield_points, fill=(16, 185, 129, 255))

    # Draw a darker green border
    line_w = max(1, size // 24)
    draw.line(shield_points, fill=(5, 150, 105, 255), width=line_w)

    # Draw checkmark in white
    check_size = w * 0.35
    check_cx = cx
    check_cy = top + h * 0.42

    check_points = [
        (check_cx - check_size * 0.45, check_cy),
        (check_cx - check_size * 0.1, check_cy + check_size * 0.4),
        (check_cx + check_size * 0.5, check_cy - check_size * 0.35),
    ]

    check_w = max(2, size // 10)
    draw.line(check_points, fill=(255, 255, 255, 255), width=check_w, joint='curve')

    return img


for s in SIZES:
    icon = draw_shield_icon(s)
    icon.save(os.path.join(OUT_DIR, f'icon{s}.png'))
    print(f'Created icon{s}.png')

print('All icons generated.')
