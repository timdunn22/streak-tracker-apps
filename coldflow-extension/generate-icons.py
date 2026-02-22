"""
generate-icons.py  —  Generate ColdFlow extension icons.
Email envelope with a lightning bolt, in the brand indigo color.
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

# Brand colors
BG_COLOR = (79, 70, 229)       # indigo-600
ENVELOPE_COLOR = (255, 255, 255)
BOLT_COLOR = (251, 191, 36)    # amber-400


def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Padding
    p = max(1, size // 8)

    # Rounded background
    d.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=max(2, size // 5),
        fill=BG_COLOR
    )

    # Envelope body
    env_top    = p + size * 0.22
    env_bottom = size - p - size * 0.12
    env_left   = p + size * 0.08
    env_right  = size - p - size * 0.08

    d.rectangle(
        [env_left, env_top, env_right, env_bottom],
        fill=None,
        outline=ENVELOPE_COLOR,
        width=max(1, size // 16)
    )

    # Envelope flap (V shape)
    mid_x = size / 2
    flap_bottom_y = (env_top + env_bottom) / 2
    stroke_w = max(1, size // 16)
    d.line(
        [(env_left, env_top), (mid_x, flap_bottom_y), (env_right, env_top)],
        fill=ENVELOPE_COLOR,
        width=stroke_w
    )

    # Lightning bolt (centered, overlay)
    bolt_cx = size * 0.52
    bolt_top = env_top + (env_bottom - env_top) * 0.15
    bolt_bottom = env_bottom - (env_bottom - env_top) * 0.05
    bolt_h = bolt_bottom - bolt_top
    bolt_w = bolt_h * 0.45

    bolt_points = [
        (bolt_cx - bolt_w * 0.05, bolt_top),                          # top
        (bolt_cx - bolt_w * 0.45, bolt_top + bolt_h * 0.48),         # left notch
        (bolt_cx - bolt_w * 0.05, bolt_top + bolt_h * 0.42),         # inner left
        (bolt_cx + bolt_w * 0.05, bolt_bottom),                       # bottom
        (bolt_cx + bolt_w * 0.45, bolt_top + bolt_h * 0.52),         # right notch
        (bolt_cx + bolt_w * 0.05, bolt_top + bolt_h * 0.58),         # inner right
    ]

    d.polygon(bolt_points, fill=BOLT_COLOR)

    return img


for s in SIZES:
    icon = draw_icon(s)
    path = os.path.join(OUT_DIR, f'icon{s}.png')
    icon.save(path, 'PNG')
    print(f'Created {path} ({s}x{s})')

print('Done.')
