#!/bin/bash
# ================================================================
# build-extensions.sh
# Rebuilds all 36 store packages (12 extensions x 3 stores)
# from source in one command.
#
# Usage:
#   ./build-extensions.sh          # build all
#   ./build-extensions.sh flipflow # build one extension only
# ================================================================

set -e
BASEDIR="$(cd "$(dirname "$0")" && pwd)"
OUTDIR="$BASEDIR/store-packages"
mkdir -p "$OUTDIR"

# Extension directory → zip basename mapping
# Format: "dir:chrome-name:firefox-name:edge-name"
ALL_EXTENSIONS=(
  "lead-harvester-extension:lead-harvester:lead-harvester:lead-harvester"
  "proposal-pilot-extension:proposal-pilot:proposal-pilot:proposal-pilot"
  "nichescout-extension:nichescout:nichescout:nichescout"
  "etsyrank-extension:etsyrank:etsyrank:etsyrank"
  "coldflow-extension:coldflow:coldflow:coldflow"
  "linkedboost-extension:linkedboost:linkedboost:linkedboost"
  "flipflow-extension:flipflow:flipflow:flipflow"
  "json-formatter-extension:json-formatter:jsonview-pro:json-formatter"
  "autoplay-killer-extension:autoplay-killer:autoplay-killer:autoplay-killer"
  "clean-copy-extension:clean-copy:clean-copy:clean-copy"
  "paste-plain-extension:paste-plain:pastepure:paste-plain"
  "url-hygiene-extension:url-hygiene:cleanlink:url-hygiene"
)

# Files/dirs to exclude from all zips
EXCLUDES=(
  "test-extension.js"
  "node_modules/*"
  "package.json"
  "package-lock.json"
  "generate-icons.py"
  "generate-icons.js"
  "generate-screenshots.js"
  "generate_icons.py"
  "test-video.mp4"
  ".DS_Store"
)

build_chrome() {
  local dir="$1" name="$2"
  local zip="$OUTDIR/${name}-chrome.zip"
  rm -f "$zip"
  cd "$BASEDIR/$dir"
  local exclude_args=()
  for ex in "${EXCLUDES[@]}"; do
    exclude_args+=(-x "$ex")
  done
  exclude_args+=(-x "firefox/*")
  zip -r "$zip" . "${exclude_args[@]}" > /dev/null 2>&1
  local size=$(du -h "$zip" | cut -f1 | xargs)
  echo "  Chrome  ${name}-chrome.zip (${size})"
  cd "$BASEDIR"
}

build_firefox() {
  local dir="$1" name="$2"
  local ffdir="$BASEDIR/$dir/firefox"
  if [ ! -d "$ffdir" ]; then
    echo "  Firefox SKIP (no firefox/ dir)"
    return
  fi
  local zip="$OUTDIR/${name}-firefox.zip"
  rm -f "$zip"
  cd "$ffdir"
  zip -r "$zip" . -x ".DS_Store" > /dev/null 2>&1
  local size=$(du -h "$zip" | cut -f1 | xargs)
  echo "  Firefox ${name}-firefox.zip (${size})"
  cd "$BASEDIR"
}

build_edge() {
  local dir="$1" name="$2"
  local zip="$OUTDIR/${name}-edge.zip"
  rm -f "$zip"
  cd "$BASEDIR/$dir"
  local exclude_args=()
  for ex in "${EXCLUDES[@]}"; do
    exclude_args+=(-x "$ex")
  done
  exclude_args+=(-x "firefox/*")
  zip -r "$zip" . "${exclude_args[@]}" > /dev/null 2>&1
  local size=$(du -h "$zip" | cut -f1 | xargs)
  echo "  Edge    ${name}-edge.zip (${size})"
  cd "$BASEDIR"
}

build_one() {
  local entry="$1"
  IFS=':' read -r dir chrome_name ff_name edge_name <<< "$entry"
  echo ""
  echo "=== $dir ==="
  build_chrome "$dir" "$chrome_name"
  build_firefox "$dir" "$ff_name"
  build_edge "$dir" "$edge_name"
}

# ---- Main ----

FILTER="${1:-}"
BUILT=0
TOTAL=0

echo "Building extension store packages..."
echo "Output: $OUTDIR"

for entry in "${ALL_EXTENSIONS[@]}"; do
  IFS=':' read -r dir _ _ _ <<< "$entry"
  TOTAL=$((TOTAL + 1))

  # If a filter was passed, only build matching extension
  if [ -n "$FILTER" ] && [[ "$dir" != *"$FILTER"* ]]; then
    continue
  fi

  build_one "$entry"
  BUILT=$((BUILT + 1))
done

echo ""
echo "================================================"
echo "  Built $BUILT extension(s) x 3 stores"
echo "  Total packages: $((BUILT * 3))"
echo "================================================"
echo ""

# Summary table
echo "Package sizes:"
echo "-------------------------------------------"
ls -lh "$OUTDIR"/*.zip 2>/dev/null | awk '{printf "  %-45s %s\n", $NF, $5}' | sed "s|$OUTDIR/||"
echo ""
