#!/usr/bin/env bash
# Builds a release APK signed with signing/krivi-quattro.jks and writes public/krivi-quattro.apk.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
PROPS="$ROOT/signing/keystore.properties"
OUT="$ROOT/public/krivi-quattro.apk"

if [[ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" && ! -x "$SDK/cmdline-tools/bin/sdkmanager" ]]; then
  echo "Android SDK not found at $SDK" >&2
  exit 1
fi
if [[ ! -f "$PROPS" ]]; then
  echo "Missing $PROPS" >&2
  exit 1
fi

store_password="$(grep '^storePassword=' "$PROPS" | cut -d= -f2-)"
key_password="$(grep '^keyPassword=' "$PROPS" | cut -d= -f2-)"
key_alias="$(grep '^keyAlias=' "$PROPS" | cut -d= -f2-)"
store_file="$(grep '^storeFile=' "$PROPS" | cut -d= -f2-)"

export ANDROID_SDK_ROOT="$SDK"
export ANDROID_HOME="$SDK"

work="$(mktemp -d)"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

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
"$build_tools/apksigner" sign \
  --ks "$ROOT/signing/$store_file" \
  --ks-key-alias "$key_alias" \
  --ks-pass "pass:$store_password" \
  --key-pass "pass:$key_password" \
  --out "$OUT" \
  "$aligned"
"$build_tools/apksigner" verify --verbose "$OUT"
rm -f "$OUT.idsig"
echo "Signed APK: $OUT ($(wc -c < "$OUT") bytes)"
