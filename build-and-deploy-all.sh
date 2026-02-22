#!/bin/bash
set -e

BASEDIR="/Users/timdunn/mobile_app_ideas"
APPS=(rewire vapefree fasttrack greenday sugarfree decaf primal iceplunge sober clearlungs)

echo "=== Building all 10 apps ==="
for APP in "${APPS[@]}"; do
  echo "Building ${APP}..."
  VITE_APP_ID=$APP npx vite build --outDir "${BASEDIR}/dist-${APP}" 2>&1 | tail -1
  echo "  ✓ dist-${APP}"
done

echo ""
echo "=== Deploying all 10 apps ==="

# Rewire needs special vercel.json
cp "${BASEDIR}/rewire/vercel.json" "${BASEDIR}/dist-rewire/vercel.json" 2>/dev/null || true

for APP in "${APPS[@]}"; do
  echo "Deploying ${APP}..."
  if [ "$APP" = "rewire" ]; then
    vercel deploy "${BASEDIR}/dist-rewire" --prod --yes --name rewire-app 2>&1 | tail -1 &
  else
    vercel deploy "${BASEDIR}/dist-${APP}" --prod --yes --name "${APP}-app" 2>&1 | tail -1 &
  fi
done

wait
echo ""
echo "All 10 apps deployed!"
echo ""
echo "Verifying assetlinks.json..."
for APP in "${APPS[@]}"; do
  case $APP in
    rewire) URL="https://rewire-psi.vercel.app" ;;
    vapefree) URL="https://vapefree-app.vercel.app" ;;
    fasttrack) URL="https://fasttrack-app-three.vercel.app" ;;
    greenday) URL="https://greenday-app.vercel.app" ;;
    sugarfree) URL="https://sugarfree-app.vercel.app" ;;
    decaf) URL="https://decaf-app-black.vercel.app" ;;
    primal) URL="https://primal-app.vercel.app" ;;
    iceplunge) URL="https://iceplunge-app.vercel.app" ;;
    sober) URL="https://sober-app-theta.vercel.app" ;;
    clearlungs) URL="https://clearlungs-app.vercel.app" ;;
  esac
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/.well-known/assetlinks.json")
  echo "  ${APP}: ${URL}/.well-known/assetlinks.json → ${STATUS}"
done
