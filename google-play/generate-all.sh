#!/bin/bash
set -e

OUTDIR="/Users/timdunn/mobile_app_ideas/google-play"

generate_app() {
  local APP_ID=$1
  local APP_URL=$2
  local APP_NAME=$3
  local THEME=$4
  local PKG="app.vercel.${APP_ID}"

  echo "Generating ${APP_NAME}..."

  curl -s -X POST "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage" \
    -H "Content-Type: application/json" \
    -d "{
      \"host\": \"${APP_URL}\",
      \"packageId\": \"${PKG}\",
      \"name\": \"${APP_NAME}\",
      \"launcherName\": \"${APP_ID}\",
      \"appVersion\": \"1.0.0.0\",
      \"appVersionCode\": 1,
      \"display\": \"standalone\",
      \"orientation\": \"portrait\",
      \"themeColor\": \"${THEME}\",
      \"backgroundColor\": \"${THEME}\",
      \"navigationColor\": \"${THEME}\",
      \"navigationColorDark\": \"${THEME}\",
      \"navigationDividerColor\": \"${THEME}\",
      \"navigationDividerColorDark\": \"${THEME}\",
      \"iconUrl\": \"${APP_URL}/pwa-512x512.svg\",
      \"maskableIconUrl\": \"${APP_URL}/pwa-512x512.svg\",
      \"monochromeIconUrl\": \"\",
      \"signingMode\": \"none\",
      \"fallbackType\": \"customtabs\",
      \"startUrl\": \"/\",
      \"webManifestUrl\": \"${APP_URL}/manifest.webmanifest\",
      \"features\": {\"locationDelegation\": false, \"playBilling\": false},
      \"enableNotifications\": false,
      \"enableSiteSettingsShortcut\": true,
      \"isChromeOSOnly\": false,
      \"splashScreenFadeOutDuration\": 300
    }" -o "${OUTDIR}/${APP_ID}-android.zip" -w "" 2>&1

  if [ -f "${OUTDIR}/${APP_ID}-android.zip" ] && [ $(stat -f%z "${OUTDIR}/${APP_ID}-android.zip") -gt 1000 ]; then
    echo "  ✓ ${APP_ID}-android.zip ($(du -h "${OUTDIR}/${APP_ID}-android.zip" | cut -f1))"
  else
    echo "  ✗ ${APP_ID} failed"
    cat "${OUTDIR}/${APP_ID}-android.zip" 2>/dev/null
  fi
}

# Already have vapefree, generate the other 9
generate_app "sober" "https://sober-app-theta.vercel.app" "Sober - Sobriety Tracker" "#0a0a0f" &
generate_app "rewire" "https://rewire-psi.vercel.app" "Rewire - Break Free" "#0a0a0f" &
generate_app "clearlungs" "https://clearlungs-app.vercel.app" "ClearLungs - Quit Smoking" "#0a0a0f" &
generate_app "decaf" "https://decaf-app-black.vercel.app" "Decaf - Caffeine Free" "#0a0a0f" &
generate_app "sugarfree" "https://sugarfree-app.vercel.app" "SugarFree - Quit Sugar" "#0a0a0f" &
wait
generate_app "fasttrack" "https://fasttrack-app-three.vercel.app" "FastTrack - Fasting Tracker" "#0a0a0f" &
generate_app "greenday" "https://greenday-app.vercel.app" "GreenDay - Cannabis Free" "#0a0a0f" &
generate_app "iceplunge" "https://iceplunge-app.vercel.app" "IcePlunge - Cold Exposure" "#0a0a0f" &
generate_app "primal" "https://primal-app.vercel.app" "Primal - Reclaim Yourself" "#0a0a0f" &
wait

echo ""
echo "All packages:"
ls -lh ${OUTDIR}/*-android.zip
