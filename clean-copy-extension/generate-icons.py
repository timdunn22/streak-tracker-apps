#!/usr/bin/env python3
"""Generate Clean Copy extension icons using Pillow."""

from PIL import Image, ImageDraw, ImageFont
import os

ICON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
os.makedirs(ICON_DIR, exist_ok=True)

SIZES = [16, 48, 128]

def draw_icon(size):
    """Draw a clipboard/copy icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scale factor
    s = size / 128.0

    # Background rounded rectangle (purple gradient feel)
    bg_color = (124, 58, 237)  # #7c3aed
    margin = int(8 * s)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=int(20 * s),
        fill=bg_color
    )

    # Clipboard body (white rectangle)
    clip_left = int(30 * s)
    clip_top = int(28 * s)
    clip_right = int(98 * s)
    clip_bottom = int(108 * s)
    draw.rounded_rectangle(
        [clip_left, clip_top, clip_right, clip_bottom],
        radius=int(8 * s),
        fill=(255, 255, 255),
        outline=None
    )

    # Clipboard clip at top
    clip_w = int(24 * s)
    clip_h = int(12 * s)
    clip_cx = size // 2
    draw.rounded_rectangle(
        [clip_cx - clip_w // 2, int(20 * s), clip_cx + clip_w // 2, int(20 * s) + clip_h],
        radius=int(4 * s),
        fill=(255, 255, 255)
    )

    # Lines on clipboard (to represent text)
    line_color = (124, 58, 237, 180)
    line_y_start = int(48 * s)
    line_spacing = int(14 * s)
    line_left = int(42 * s)
    line_right_full = int(86 * s)
    line_right_short = int(72 * s)
    line_h = int(4 * s)

    for i in range(4):
        y = line_y_start + i * line_spacing
        right = line_right_full if i % 2 == 0 else line_right_short
        draw.rounded_rectangle(
            [line_left, y, right, y + line_h],
            radius=int(2 * s),
            fill=line_color
        )

    # Small green checkmark in bottom right
    check_cx = int(88 * s)
    check_cy = int(96 * s)
    check_r = int(14 * s)
    draw.ellipse(
        [check_cx - check_r, check_cy - check_r, check_cx + check_r, check_cy + check_r],
        fill=(34, 197, 94)  # green
    )
    # Checkmark
    check_lw = max(2, int(3 * s))
    draw.line(
        [(check_cx - int(6*s), check_cy), (check_cx - int(1*s), check_cy + int(5*s))],
        fill='white', width=check_lw
    )
    draw.line(
        [(check_cx - int(1*s), check_cy + int(5*s)), (check_cx + int(7*s), check_cy - int(5*s))],
        fill='white', width=check_lw
    )

    return img


for size in SIZES:
    icon = draw_icon(size)
    path = os.path.join(ICON_DIR, f'icon{size}.png')
    icon.save(path, 'PNG')
    print(f'Created {path}')

print('All icons generated.')
