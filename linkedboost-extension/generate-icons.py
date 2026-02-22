"""
Generate LinkedBoost extension icons using Pillow.
LinkedIn-style rocket icon with brand colors.
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# LinkedIn brand blue
BG_COLOR = (10, 102, 194)  # #0a66c2
ACCENT_COLOR = (255, 255, 255)

def draw_rocket(draw, size):
    """Draw a stylized rocket icon."""
    cx = size / 2
    cy = size / 2
    s = size / 128  # scale factor

    # Rocket body (main shape - elongated oval)
    body_top = cy - 40 * s
    body_bottom = cy + 30 * s
    body_left = cx - 14 * s
    body_right = cx + 14 * s

    # Nose cone (triangle at top)
    nose_points = [
        (cx, cy - 52 * s),       # tip
        (cx - 14 * s, cy - 30 * s),  # left base
        (cx + 14 * s, cy - 30 * s),  # right base
    ]
    draw.polygon(nose_points, fill=ACCENT_COLOR)

    # Body
    draw.rounded_rectangle(
        [body_left, cy - 30 * s, body_right, body_bottom],
        radius=int(6 * s),
        fill=ACCENT_COLOR
    )

    # Window (circle)
    window_r = 7 * s
    draw.ellipse(
        [cx - window_r, cy - 20 * s, cx + window_r, cy - 20 * s + 2 * window_r],
        fill=BG_COLOR,
        outline=ACCENT_COLOR
    )

    # Left fin
    left_fin = [
        (cx - 14 * s, cy + 10 * s),
        (cx - 28 * s, cy + 38 * s),
        (cx - 14 * s, cy + 30 * s),
    ]
    draw.polygon(left_fin, fill=ACCENT_COLOR)

    # Right fin
    right_fin = [
        (cx + 14 * s, cy + 10 * s),
        (cx + 28 * s, cy + 38 * s),
        (cx + 14 * s, cy + 30 * s),
    ]
    draw.polygon(right_fin, fill=ACCENT_COLOR)

    # Flame (bottom exhaust)
    flame_points = [
        (cx - 8 * s, cy + 30 * s),
        (cx, cy + 50 * s),
        (cx + 8 * s, cy + 30 * s),
    ]
    draw.polygon(flame_points, fill=(247, 201, 72))  # Gold/yellow

    # Inner flame
    inner_flame = [
        (cx - 4 * s, cy + 30 * s),
        (cx, cy + 42 * s),
        (cx + 4 * s, cy + 30 * s),
    ]
    draw.polygon(inner_flame, fill=(245, 166, 35))  # Orange


def generate_icon(size):
    """Generate a single icon at the given size."""
    # Create image with rounded corners effect
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rectangle
    radius = max(size // 5, 2)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG_COLOR)

    # Draw rocket
    draw_rocket(draw, size)

    # Save
    filepath = os.path.join(OUTPUT_DIR, f'icon{size}.png')
    img.save(filepath, 'PNG')
    print(f'Generated: {filepath} ({size}x{size})')


if __name__ == '__main__':
    for s in SIZES:
        generate_icon(s)
    print('All icons generated!')
