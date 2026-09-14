#!/bin/bash
#
# Build the iOS app and put it into TestFlight, in one command.
#
#   ./scripts/testflight.sh                  # bump build number, build, upload
#   ./scripts/testflight.sh --validate-only  # everything but the upload
#   ./scripts/testflight.sh --build-only     # build + sign the .ipa, no Apple login needed
#   ./scripts/testflight.sh --no-bump        # keep the current build number
#   ./scripts/testflight.sh --ipa app.ipa    # upload an .ipa that already exists
#
# Why not EAS: cloud builds are metered and queued, and the free plan's iOS
# builds run out. This does the same work on this machine.
#
# ── Credentials ──────────────────────────────────────────────────────────────
#
# An app-specific password from appleid.apple.com → Sign-In and Security. Never
# passed as an argument, because arguments are visible to every process through
# `ps` and land in shell history. Read from, in order:
#
#   1. the macOS keychain, item "AC_PASSWORD"      ← recommended
#   2. $APP_SPECIFIC_PASSWORD in the environment
#
# Store it once:
#
#   security add-generic-password -a "<apple-id>" -w "<password>" -s AC_PASSWORD -U
#
# ── Three things this works around, all learned the hard way ─────────────────
#
# 1. ENABLE_USER_SCRIPT_SANDBOXING. `expo prebuild` writes YES into the Xcode
#    project. React Native's bundle phase writes main.jsbundle outside its
#    declared outputs, so Xcode's script sandbox denies it and the archive dies
#    with a bare EPERM. Patched below on every run, because prebuild puts it
#    back.
#
# 2. iCloud Drive. This repo sits in ~/Desktop, which iCloud syncs, and the
#    sync daemon stamps com.apple.FinderInfo onto build products. codesign
#    refuses to sign anything carrying it: "resource fork, Finder information,
#    or similar detritus not allowed". So the build directory lives in /tmp,
#    outside any file provider. Moving the repo off the Desktop would make this
#    unnecessary.
#
# 3. Duplicate build numbers. Apple rejects a build number it has already seen,
#    and the rejection arrives after the upload. The number is bumped here
#    before the build, so a repeat run cannot collide.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APPLE_ID="${APPLE_ID:-romeoatoyan44@gmail.com}"
ASC_APP_ID="${ASC_APP_ID:-}"                    # App Store Connect → App Information → Apple ID (optional, for the link)
SCHEME="${SCHEME:-PaperVoice}"
TEAM_ID="${TEAM_ID:-YKVUBV84VS}"                # also in app.json → ios.appleTeamId and ExportOptions.plist

# Outside the project, so iCloud never touches the build products. Kept between
# runs, because a warm build is minutes rather than a quarter of an hour.
WORKDIR="${TESTFLIGHT_WORKDIR:-/tmp/papervoice-testflight}"
DERIVED_DATA="$WORKDIR/derived"
ARCHIVE="$WORKDIR/PaperVoice.xcarchive"
EXPORT_DIR="$WORKDIR/export"

IPA_PATH=""
VALIDATE_ONLY=false
BUILD_ONLY=false
BUMP=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ipa) IPA_PATH="$2"; shift 2 ;;
    --validate-only) VALIDATE_ONLY=true; shift ;;
    --build-only) BUILD_ONLY=true; shift ;;
    --no-bump) BUMP=false; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n❌ %s\n' "$*" >&2; exit 1; }

cd "$PROJECT_ROOT"

# ── 1. Credentials, before anything slow ─────────────────────────────────────
say "🔑 [1/7] Locating the app-specific password"
if [ "$BUILD_ONLY" = true ]; then
  echo "   skipped (--build-only)"
else

APP_PW="$(security find-generic-password -s AC_PASSWORD -w 2>/dev/null || true)"
if [ -n "$APP_PW" ]; then
  echo "   ✓ from the keychain (AC_PASSWORD)"
else
  APP_PW="${APP_SPECIFIC_PASSWORD:-}"
  [ -n "$APP_PW" ] && echo "   ✓ from \$APP_SPECIFIC_PASSWORD"
fi

[ -n "$APP_PW" ] || fail "No app-specific password found. Store one:

  security add-generic-password -a \"$APPLE_ID\" -w \"<password>\" -s AC_PASSWORD -U

or export APP_SPECIFIC_PASSWORD for one run. Generate it at appleid.apple.com
→ Sign-In and Security → App-Specific Passwords."

# altool reads it from the environment, so it stays out of `ps` and history.
export ALTOOL_PW="$APP_PW"
echo "   Apple ID: $APPLE_ID"
fi

if [ -n "$IPA_PATH" ]; then
  say "⏩ [2-5/7] Skipping the build — using $IPA_PATH"
  [ -f "$IPA_PATH" ] || fail "No such file: $IPA_PATH"
else

  # ── 2. Build number ────────────────────────────────────────────────────────
  say "🔢 [2/7] Build number"

  CURRENT="$(node -e "
    const j = require('$PROJECT_ROOT/app.json');
    process.stdout.write(String((j.expo.ios && j.expo.ios.buildNumber) || '0'));
  ")"

  if [ "$BUMP" = true ]; then
    NEXT=$(( CURRENT + 1 ))
    node -e "
      const fs = require('fs');
      const p = '$PROJECT_ROOT/app.json';
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      j.expo.ios = j.expo.ios || {};
      j.expo.ios.buildNumber = '$NEXT';
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    "
    echo "   $CURRENT → $NEXT (app.json)"
  else
    NEXT="$CURRENT"
    echo "   $NEXT, unchanged (--no-bump)"
  fi

  # The Xcode project carries its own copy, written by prebuild. Setting it
  # directly avoids a full prebuild just to move one integer.
  PLIST="$PROJECT_ROOT/ios/$SCHEME/Info.plist"
  if [ ! -f "$PLIST" ]; then
    echo "   ios/ is missing — generating it (expo prebuild + pod install)"
    npx expo prebuild -p ios > "$WORKDIR.prebuild.log" 2>&1 \
      || fail "expo prebuild failed. Log: $WORKDIR.prebuild.log"
  fi
  [ -f "$PLIST" ] || fail "No Info.plist at $PLIST after prebuild"
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT" "$PLIST"
  echo "   ✓ Info.plist set to $NEXT"

  # EXPO_PUBLIC_ keys are inlined when Xcode bundles the JS. A build without
  # them uploads fine and then fails on every scan.
  if ! grep -qsE "^EXPO_PUBLIC_GEMINI_API_KEY=.+" .env .env.local .env.production .env.production.local \
    || ! grep -qsE "^EXPO_PUBLIC_ELEVENLABS_API_KEY=.+" .env .env.local .env.production .env.production.local; then
    fail "EXPO_PUBLIC_GEMINI_API_KEY / EXPO_PUBLIC_ELEVENLABS_API_KEY not set in .env or .env.local"
  fi
  echo "   ✓ API keys present in env files"

  # ── 3. The setting prebuild keeps reinstating ──────────────────────────────
  say "🩹 [3/7] Disabling Xcode's user-script sandboxing"
  PBXPROJ="$PROJECT_ROOT/ios/$SCHEME.xcodeproj/project.pbxproj"
  if grep -q "ENABLE_USER_SCRIPT_SANDBOXING = YES;" "$PBXPROJ"; then
    sed -i '' 's/ENABLE_USER_SCRIPT_SANDBOXING = YES;/ENABLE_USER_SCRIPT_SANDBOXING = NO;/g' "$PBXPROJ"
    echo "   ✓ patched (prebuild had set it back to YES)"
  else
    echo "   ✓ already NO"
  fi

  # ── 4. Archive ─────────────────────────────────────────────────────────────
  say "🏗️  [4/7] Archiving — first run takes ~15 min, later ones far less"
  echo "   Build products: $WORKDIR (outside iCloud, deliberately)"

  mkdir -p "$WORKDIR"
  rm -rf "$ARCHIVE"

  xcodebuild \
    -workspace "$PROJECT_ROOT/ios/$SCHEME.xcworkspace" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE" \
    -derivedDataPath "$DERIVED_DATA" \
    ENABLE_USER_SCRIPT_SANDBOXING=NO \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    CODE_SIGN_STYLE=Automatic \
    -allowProvisioningUpdates \
    archive \
    > "$WORKDIR/archive.log" 2>&1 \
    || {
      echo
      grep -E "error:|The following build commands failed" -A3 "$WORKDIR/archive.log" | tail -20
      fail "Archive failed. Full log: $WORKDIR/archive.log"
    }

  [ -d "$ARCHIVE" ] || fail "xcodebuild reported success but produced no archive"
  echo "   ✓ archived"

  # ── 5. Export a signed .ipa ────────────────────────────────────────────────
  say "✍️  [5/7] Exporting a signed .ipa"

  rm -rf "$EXPORT_DIR"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$SCRIPT_DIR/ExportOptions.plist" \
    -allowProvisioningUpdates \
    > "$WORKDIR/export.log" 2>&1 \
    || {
      echo
      tail -20 "$WORKDIR/export.log"
      echo
      fail "Export failed. Full log: $WORKDIR/export.log

If it could not find a distribution certificate, Apple wants an authenticated
session it cannot get from a script. Open the archive in Xcode (Window →
Organizer) and use Distribute App once; the credentials it sets up are reused
by later runs of this script."
    }

  IPA_PATH="$(find "$EXPORT_DIR" -name "*.ipa" | head -1)"
  [ -n "$IPA_PATH" ] || fail "Export produced no .ipa — see $WORKDIR/export.log"
  echo "   ✓ $IPA_PATH"
fi

# ── 6. What is actually in it ────────────────────────────────────────────────
say "🔍 [6/7] Inspecting the binary"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$IPA_PATH" -d "$TMP"
APP_PLIST="$(find "$TMP/Payload" -maxdepth 2 -name Info.plist | head -1)"
[ -n "$APP_PLIST" ] || fail "No Info.plist inside the .ipa — is it an app archive?"

VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PLIST")"
BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PLIST")"
echo "   Version $VERSION (build $BUILD)"

# An unsigned .ipa — build-ipa.sh output, say — has no embedded profile, and
# Apple's error for that is far less clear than this one.
find "$TMP/Payload" -maxdepth 2 -name embedded.mobileprovision | grep -q . \
  || fail "Not signed for distribution (no embedded.mobileprovision)."
echo "   ✓ signed, with an embedded provisioning profile"

if [ "$BUILD_ONLY" = true ]; then
  say "✅ Built $VERSION ($BUILD): $IPA_PATH — stopping here (--build-only)."
  exit 0
fi

# ── 7. Validate, then upload ─────────────────────────────────────────────────
say "🧪 [7/7] Validating with Apple"
xcrun altool --validate-app -t ios -f "$IPA_PATH" \
  -u "$APPLE_ID" -p "@env:ALTOOL_PW" 2>&1 | tee "$TMP/validate.log"

if grep -qE "\bERROR:" "$TMP/validate.log"; then
  fail "Validation reported errors — see above. Nothing was uploaded."
fi

if [ "$VALIDATE_ONLY" = true ]; then
  say "✅ Valid — $VERSION ($BUILD). Stopping here (--validate-only)."
  exit 0
fi

say "🚀 Uploading to App Store Connect"
xcrun altool --upload-app -t ios -f "$IPA_PATH" \
  -u "$APPLE_ID" -p "@env:ALTOOL_PW" 2>&1 | tee "$TMP/upload.log"

if grep -qE "\bERROR:" "$TMP/upload.log"; then
  fail "Upload reported errors — see above."
fi

DELIVERY_ID="$(grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$TMP/upload.log" | head -1 || true)"

cat <<EOF

  ✅  Uploaded $VERSION ($BUILD)

  Delivery ID : ${DELIVERY_ID:-(not reported)}
  TestFlight  : https://appstoreconnect.apple.com/apps/${ASC_APP_ID:-<app id>}/testflight/ios

  Apple processes it in 1–15 minutes and emails when done. To poll instead:

    xcrun altool --build-status --delivery-id "${DELIVERY_ID:-<uuid>}" \\
      -u "$APPLE_ID" -p @keychain:AC_PASSWORD | grep -E "PROCESSINGSTATE|QCSTATE"

  PROCESSINGSTATE: VALID with QCSTATE: BETA_INTERNAL_TESTING means internal
  testers can install it.

  This uploaded a build. It did not submit anything for App Store review.
EOF
