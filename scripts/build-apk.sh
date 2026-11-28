#!/usr/bin/env bash
# Builds a release APK and writes public/krivi-quattro.apk.
# Signing prefers ANDROID_KEYSTORE_* env vars. A local signing/ directory is only a fallback and is not committed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
OUT="$ROOT/public/krivi-quattro.apk"

if [[ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" && ! -x "$SDK/cmdline-tools/bin/sdkmanager" ]]; then
  echo "Android SDK not found at $SDK" >&2
  exit 1
fi

export ANDROID_SDK_ROOT="$SDK"
export ANDROID_HOME="$SDK"

work="$(mktemp -d)"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

sign_mode="unsigned"
keystore=""
if [[ -n "${ANDROID_KEYSTORE_B64:-}" && -n "${ANDROID_KEYSTORE_PASSWORD:-}" && -n "${ANDROID_KEY_ALIAS:-}" ]]; then
  keystore="$work/release.jks"
  printf '%s' "$ANDROID_KEYSTORE_B64" | base64 -d > "$keystore"
  if [[ -z "${ANDROID_KEY_PASSWORD:-}" ]]; then
    export ANDROID_KEY_PASSWORD="$ANDROID_KEYSTORE_PASSWORD"
  fi
  sign_mode="env"
elif [[ -f "$ROOT/signing/keystore.properties" && -d "$ROOT/signing" ]]; then
  props="$ROOT/signing/keystore.properties"
  store_password="$(grep '^storePassword=' "$props" | cut -d= -f2-)"
  key_password="$(grep '^keyPassword=' "$props" | cut -d= -f2-)"
  key_alias="$(grep '^keyAlias=' "$props" | cut -d= -f2-)"
  store_file="$(grep '^storeFile=' "$props" | cut -d= -f2-)"
  keystore="$ROOT/signing/$store_file"
  if [[ ! -f "$keystore" ]]; then
    echo "Local keystore file is missing; building unsigned." >&2
    sign_mode="unsigned"
  else
    export ANDROID_KEYSTORE_PASSWORD="$store_password"
    export ANDROID_KEY_PASSWORD="${key_password:-$store_password}"
    export ANDROID_KEY_ALIAS="$key_alias"
    sign_mode="local"
  fi
fi

mkdir -p "$work/www"
cat > "$work/www/index.html" << 'HTML'
<!doctype html>
<html lang="hr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Krivi Quattro</title>
  </head>
  <body style="margin:0;background:#070708;color:#fff;font-family:sans-serif">
    <p style="padding:24px">Krivi Quattro se otvara…</p>
  </body>
</html>
HTML
cp "$ROOT/public/logo.jpg" "$work/www/logo.jpg" 2>/dev/null || true

cd "$work"
npm init -y >/dev/null
npm install --no-audit --no-fund @capacitor/core@6.2.0 @capacitor/cli@6.2.0 @capacitor/android@6.2.0
npx cap init "Krivi Quattro" hr.krivi.quattro --web-dir www
npx cap add android

node << 'JS'
const fs = require("fs");
const server = { url: "https://krivi-quattro2.vercel.app", cleartext: false, androidScheme: "https" };
if (fs.existsSync("capacitor.config.json")) {
  const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
  config.server = server;
  fs.writeFileSync("capacitor.config.json", JSON.stringify(config, null, 2));
}
if (fs.existsSync("capacitor.config.ts")) {
  let text = fs.readFileSync("capacitor.config.ts", "utf8");
  if (!text.includes("server:")) {
    text = text.replace(
      /};\s*$/,
      `  server: { url: "https://krivi-quattro2.vercel.app", cleartext: false, androidScheme: "https" },\n};\n`,
    );
    fs.writeFileSync("capacitor.config.ts", text);
  }
}
JS
npx cap sync android

python3 "$ROOT/scripts/android-icons.py" "$work/android/app/src/main/res" "$ROOT/public/icons/icon-512.png"

gradle_file="$work/android/app/build.gradle"
python3 - "$gradle_file" << 'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
text2, n1 = re.subn(r"versionCode \d+", "versionCode 3", text, count=1)
text2, n2 = re.subn(r'versionName "[^"]+"', 'versionName "1.2.0"', text2, count=1)
if n1 != 1 or n2 != 1:
    raise SystemExit("Could not set versionCode 3 / versionName 1.2.0 in " + str(path))
path.write_text(text2)
print(path)
PY

cd android
chmod +x ./gradlew
./gradlew assembleRelease --no-daemon

unsigned="$(find app/build/outputs/apk/release -name '*.apk' | head -n 1)"
if [[ -z "$unsigned" ]]; then
  echo "Release APK was not produced" >&2
  exit 1
fi

build_tools="$(find "$SDK/build-tools" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
aligned="$work/aligned.apk"
"$build_tools/zipalign" -p -f 4 "$unsigned" "$aligned"

if [[ "$sign_mode" == "unsigned" ]]; then
  cp "$aligned" "$OUT"
  echo "Unsigned APK (no signing key): $OUT ($(wc -c < "$OUT") bytes)"
  exit 0
fi

"$build_tools/apksigner" sign \
  --ks "$keystore" \
  --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_KEYSTORE_PASSWORD \
  --key-pass env:ANDROID_KEY_PASSWORD \
  --out "$OUT" \
  "$aligned"
"$build_tools/apksigner" verify --verbose "$OUT"
rm -f "$OUT.idsig"
echo "Signed APK: $OUT ($(wc -c < "$OUT") bytes)"
