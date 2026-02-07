#!/bin/bash
set -e

APPS="rewire vapefree fasttrack greenday sugarfree decaf primal iceplunge sober clearlungs"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Building and deploying all 10 apps..."
echo ""

for app in $APPS; do
  echo "=== Building $app ==="

  # Build with the app-specific config
  cd "$PROJECT_DIR"
  VITE_APP_ID=$app npx vite build --outDir "dist-$app" 2>&1 | tail -5

  echo "=== Deploying $app ==="

  # Deploy to Vercel with a unique project name
  cd "$PROJECT_DIR/dist-$app"
  npx vercel --prod --yes --name "$app-app" 2>&1 | grep -E "(Production|Aliased|Error)" || true

  echo ""
done

echo "All 10 apps deployed!"
