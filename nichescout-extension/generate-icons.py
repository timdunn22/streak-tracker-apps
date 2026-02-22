"""Generate NicheScout extension icons — magnifying glass + chart icon."""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

def draw_icon(size):
    """Draw a magnifying glass with a mini bar-chart inside."""
    scale = size / 128
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Background — rounded square
    pad = int(4 * scale)
    radius = int(24 * scale)
    d.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(99, 102, 241),  # indigo-500
    )

    # Magnifying glass circle
    cx, cy = int(50 * scale), int(48 * scale)
    r = int(28 * scale)
    ring_w = max(int(6 * scale), 2)
    d.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        outline=(255, 255, 255),
        width=ring_w,
    )

    # Handle
    hx1 = cx + int(r * 0.7)
    hy1 = cy + int(r * 0.7)
    hx2 = cx + int(r * 1.5)
    hy2 = cy + int(r * 1.5)
    d.line([(hx1, hy1), (hx2, hy2)], fill=(255, 255, 255), width=max(int(7 * scale), 2))

    # Mini bar chart inside the glass
    bar_w = max(int(6 * scale), 2)
    bar_gap = max(int(3 * scale), 1)
    bars_start_x = cx - int(15 * scale)
    bars_base_y = cy + int(12 * scale)
    bar_heights = [int(12 * scale), int(22 * scale), int(18 * scale), int(30 * scale)]
    colors = [(34, 197, 94), (234, 179, 8), (99, 102, 241), (34, 197, 94)]

    for i, (bh, col) in enumerate(zip(bar_heights, colors)):
        x = bars_start_x + i * (bar_w + bar_gap)
        y_top = bars_base_y - bh
        d.rectangle([x, y_top, x + bar_w, bars_base_y], fill=col)

    return img

for s in SIZES:
    icon = draw_icon(s)
    path = os.path.join(OUT_DIR, f'icon{s}.png')
    icon.save(path)
    print(f'Created {path} ({s}x{s})')

print('Done!')
