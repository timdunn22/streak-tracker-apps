"""
Generate PastePure icons: clipboard with "T" for text.
"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
ICON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
os.makedirs(ICON_DIR, exist_ok=True)

for size in SIZES:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Clipboard body
    pad = max(1, size // 16)
    clip_left = pad
    clip_right = size - pad
    clip_top = size // 5
    clip_bottom = size - pad
    radius = max(2, size // 10)

    # Draw clipboard rectangle with rounded corners
    draw.rounded_rectangle(
        [clip_left, clip_top, clip_right, clip_bottom],
        radius=radius,
        fill='#2d2d44',
        outline='#48c774',
        width=max(1, size // 16)
    )

    # Clipboard clip at top
    clip_width = size // 3
    clip_height = max(3, size // 8)
    clip_x1 = (size - clip_width) // 2
    clip_x2 = clip_x1 + clip_width
    clip_y1 = clip_top - clip_height // 2
    clip_y2 = clip_y1 + clip_height
    draw.rounded_rectangle(
        [clip_x1, clip_y1, clip_x2, clip_y2],
        radius=max(1, clip_height // 3),
        fill='#48c774'
    )

    # Draw "T" in center — use a minimum font size of 8
    font_size = max(8, int(size * 0.4))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

    text = "T"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = clip_top + (clip_bottom - clip_top - th) // 2
    draw.text((tx, ty), text, fill='#48c774', font=font)

    out_path = os.path.join(ICON_DIR, f'icon{size}.png')
    img.save(out_path, 'PNG')
    print(f'Created {out_path}')

print('All icons generated.')
