#!/bin/bash
set -e

W=1080
H=1920

make_video() {
  local APP_ID=$1
  local APP_NAME=$2
  local TAGLINE=$3
  local COLOR=$4

  echo "Creating video for ${APP_NAME}..."

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

make_video "fasttrack" "FastTrack" "Track your fasting streak" "0xf97316"
make_video "greenday" "GreenDay" "Track your cannabis-free streak" "0x22c55e"
make_video "iceplunge" "IcePlunge" "Track your cold plunge streak" "0x06b6d4"
make_video "primal" "Primal" "Break free. Reclaim yourself." "0xef4444"

# Now make a showcase video: all 10 app streak screens, 1.5s each = 15s
echo ""
echo "Creating showcase video..."

ffmpeg -y \
  -loop 1 -t 1.5 -i "promo-assets/vapefree-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/sober-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/rewire-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/clearlungs-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/decaf-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/sugarfree-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/fasttrack-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/greenday-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/iceplunge-streak.png" \
  -loop 1 -t 1.5 -i "promo-assets/primal-streak.png" \
  -filter_complex "
    [0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v0];
    [1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v1];
    [2:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v2];
    [3:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v3];
    [4:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v4];
    [5:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v5];
    [6:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v6];
    [7:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v7];
    [8:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v8];
    [9:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x08080f,setsar=1[v9];
    [v0][v1]xfade=transition=slideleft:duration=0.3:offset=1.2[t01];
    [t01][v2]xfade=transition=slideleft:duration=0.3:offset=2.4[t02];
    [t02][v3]xfade=transition=slideleft:duration=0.3:offset=3.6[t03];
    [t03][v4]xfade=transition=slideleft:duration=0.3:offset=4.8[t04];
    [t04][v5]xfade=transition=slideleft:duration=0.3:offset=6.0[t05];
    [t05][v6]xfade=transition=slideleft:duration=0.3:offset=7.2[t06];
    [t06][v7]xfade=transition=slideleft:duration=0.3:offset=8.4[t07];
    [t07][v8]xfade=transition=slideleft:duration=0.3:offset=9.6[t08];
    [t08][v9]xfade=transition=slideleft:duration=0.3:offset=10.8[t09];
    [t09]drawtext=text='10 Free Streak Trackers':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=h-220:enable='between(t,0,12)':font=Arial:borderw=3:bordercolor=black,
    drawtext=text='Quit Any Habit · 100%% Free · No Account':fontsize=28:fontcolor=0xaaaacc:x=(w-text_w)/2:y=h-170:enable='between(t,0,12)':font=Arial:borderw=2:bordercolor=black,
    drawtext=text='Link in bio':fontsize=34:fontcolor=0x00e5cc:x=(w-text_w)/2:y=h-120:enable='between(t,8,12)':font=Arial:borderw=2:bordercolor=black
    [out]
  " \
  -map "[out]" \
  -c:v libx264 -pix_fmt yuv420p -r 30 \
  -t 11.7 \
  "promo-assets/showcase-tiktok.mp4"

echo "  ✓ showcase-tiktok.mp4"
echo ""
echo "All videos:"
ls -lh promo-assets/*-tiktok.mp4
