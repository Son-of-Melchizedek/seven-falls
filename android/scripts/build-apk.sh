#!/usr/bin/env bash
# Rebuild the Seven Falls APK from scratch. Safe to run after a reboot wiped /tmp.
#
#   1. inline the game into one HTML (WebView cannot load separate <script src>)
#   2. rebuild the wrapper skeleton if /tmp lost it
#   3. gradle assembleDebug, sign v1+v2+v3 (MIUI needs v1), verify, hash-check
set -e
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
ANDROID_DIR="$REPO/android"
VER="${1:-v1}"

if [ ! -f /tmp/android-sdk/build-tools/34.0.0/apksigner ]; then
  echo "Android SDK missing at /tmp/android-sdk — reinstall build-tools 34.0.0 first" >&2; exit 1
fi
if [ ! -x /tmp/gradle-8.5/bin/gradle ]; then
  echo "Gradle 8.5 missing at /tmp/gradle-8.5 — reinstall Gradle 8.5 first" >&2; exit 1
fi

# 1. single-file bundle
mkdir -p "$REPO/dist"
python3 "$ANDROID_DIR/scripts/inline.py" "$REPO" "$ANDROID_DIR/build/seven-falls.html"

# 2. wrapper
WRAP=/tmp/sf-apk
if [ ! -d "$WRAP/app/src/main" ]; then
  mkdir -p "$WRAP"
  (cd "$ANDROID_DIR/wrapper" && tar cf - .) | (cd "$WRAP" && tar xf -)
fi
mkdir -p "$WRAP/app/src/main/assets"
cp "$ANDROID_DIR/build/seven-falls.html" "$WRAP/app/src/main/assets/seven-falls.html"

# 3. build + sign
cd "$WRAP"
export ANDROID_HOME=/tmp/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
/tmp/gradle-8.5/bin/gradle assembleDebug --no-daemon | tail -3
test -f app/build/outputs/apk/debug/app-debug.apk || { echo "BUILD FAILED — not signing a stale artifact" >&2; exit 1; }

OUT="$REPO/dist/seven-falls-$VER.apk"
/tmp/android-sdk/build-tools/34.0.0/apksigner sign \
  --ks "$HOME/.android/debug.keystore" --ks-pass pass:android --key-pass pass:android \
  --min-sdk-version 21 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" app/build/outputs/apk/debug/app-debug.apk

# 4. gates
/tmp/android-sdk/build-tools/34.0.0/apksigner verify --verbose --min-sdk-version 21 "$OUT" | head -5
A=$(unzip -p "$OUT" assets/seven-falls.html | sha256sum | cut -d' ' -f1)
B=$(sha256sum "$ANDROID_DIR/build/seven-falls.html" | cut -d' ' -f1)
[ "$A" = "$B" ] || { echo "ASSET MISMATCH $A vs $B" >&2; exit 1; }
echo "OK $OUT  sha256(asset)=${A:0:16}  size=$(du -h "$OUT" | cut -f1)"
