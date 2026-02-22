#!/bin/bash
set -e

# TikTok dimensions: 1080x1920
W=1080
H=1920

# Each screenshot is 393x852 at 3x = 1179x2556. We need to fit into 1080x1920.
# We'll scale and pad onto a dark background, then add text overlays.

make_video() {
  local APP_ID=$1
  local APP_NAME=$2
  local TAGLINE=$3
  local HASHTAGS=$4
  local COLOR=$5

  echo "Creating video for ${APP_NAME}..."

  # Build a video: 2.5s per screen (streak, timeline, stats, share) = 10s total
  # With crossfade transitions and text overlay

  ffmpeg -y \
    -loop 1 -t 2.5 -i "promo-assets/${APP_ID}-streak.png" \
    -loop 1 -t 2.5 -i "promo-assets/${APP_ID}-timeline.png" \
    -loop 1 -t 2.5 -i "promo-assets/${APP_ID}-stats.png" \
    -loop 1 -t 2.5 -i "promo-assets/${APP_ID}-share.png" \
    -filter_complex "
      [0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v0];
      [1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v1];
      [2:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v2];
      [3:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v3];
      [v0][v1]xfade=transition=fade:duration=0.4:offset=2.1[t01];
      [t01][v2]xfade=transition=fade:duration=0.4:offset=4.2[t02];
      [t02][v3]xfade=transition=fade:duration=0.4:offset=6.3[t03];
      [t03]drawtext=text='${TAGLINE}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=h-220:enable='between(t,0,8.4)':font=Arial:borderw=3:bordercolor=black,
      drawtext=text='100%% Free · No Account · Private':fontsize=30:fontcolor=0xaaaacc:x=(w-text_w)/2:y=h-170:enable='between(t,0,8.4)':font=Arial:borderw=2:bordercolor=black,
      drawtext=text='Link in bio':fontsize=34:fontcolor=${COLOR}:x=(w-text_w)/2:y=h-120:enable='between(t,5,8.4)':font=Arial:borderw=2:bordercolor=black
      [out]
    " \
    -map "[out]" \
    -c:v libx264 -pix_fmt yuv420p -r 30 \
    -t 8.4 \
    "promo-assets/${APP_ID}-tiktok.mp4"

  echo "  ✓ ${APP_ID}-tiktok.mp4"
}

make_video "vapefree" "VapeFree" "Track your vape-free streak" "#QuitVaping #VapeFree #NicotineFree" "0x00e5cc"
make_video "sober" "Sober" "Track your sobriety streak" "#Sober #SoberLife #Recovery" "0x6366f1"
make_video "clearlungs" "ClearLungs" "Track your smoke-free streak" "#QuitSmoking #SmokeFree #ClearLungs" "0x22c55e"
make_video "rewire" "Rewire" "Break free. Rewire your brain." "#Rewire #SelfImprovement #BreakFree" "0x8b5cf6"
make_video "decaf" "Decaf" "Track your caffeine-free streak" "#Decaf #CaffeineFree #QuitCoffee" "0xf59e0b"
make_video "sugarfree" "SugarFree" "Track your sugar-free streak" "#SugarFree #QuitSugar #NoSugar" "0xec4899"

echo ""
echo "All videos created!"
ls -lh promo-assets/*-tiktok.mp4
