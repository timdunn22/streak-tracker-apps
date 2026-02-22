#!/bin/bash
set -e

GPDIR="/Users/timdunn/mobile_app_ideas/google-play"
KEYSTORE="${GPDIR}/streak-apps.jks"
STOREPASS="streaktracker2026"
ALIAS="streak-apps"

APPS=(vapefree sober rewire clearlungs decaf sugarfree fasttrack greenday iceplunge primal)

mkdir -p "${GPDIR}/signed"

for APP in "${APPS[@]}"; do
  echo "Signing ${APP}..."

  # Extract AAB from zip
  unzip -o -j "${GPDIR}/${APP}-android.zip" "*.aab" -d "${GPDIR}/unsigned" 2>/dev/null
  AAB_FILE=$(ls "${GPDIR}/unsigned/"*.aab 2>/dev/null | head -1)

  if [ -z "$AAB_FILE" ]; then
    echo "  ✗ No AAB found for ${APP}"
    continue
  fi

  # Sign the AAB using jarsigner
  cp "$AAB_FILE" "${GPDIR}/signed/${APP}-signed.aab"
  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$KEYSTORE" \
    -storepass "$STOREPASS" \
    -keypass "$STOREPASS" \
    "${GPDIR}/signed/${APP}-signed.aab" \
    "$ALIAS" 2>&1 | tail -1

  # Also extract APK for testing
  unzip -o -j "${GPDIR}/${APP}-android.zip" "*.apk" -d "${GPDIR}/unsigned" 2>/dev/null
  APK_FILE=$(ls "${GPDIR}/unsigned/"*.apk 2>/dev/null | head -1)
  if [ -n "$APK_FILE" ]; then
    cp "$APK_FILE" "${GPDIR}/signed/${APP}-signed.apk"
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
      -keystore "$KEYSTORE" \
      -storepass "$STOREPASS" \
      -keypass "$STOREPASS" \
      "${GPDIR}/signed/${APP}-signed.apk" \
      "$ALIAS" 2>&1 | tail -1
  fi

  # Cleanup
  rm -rf "${GPDIR}/unsigned"

  echo "  ✓ ${APP}-signed.aab + ${APP}-signed.apk"
done

echo ""
echo "All signed packages:"
ls -lh "${GPDIR}/signed/"
