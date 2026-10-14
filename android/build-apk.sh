#!/usr/bin/env bash
# ============================================================
# AI 健身助手 - 安卓 APK 构建脚本（无 Gradle，直接使用 build-tools）
# 前置：Android SDK（build-tools 34 + platform android-34）+ JDK 11+
# 用法：./build-apk.sh
# 产物：android/app-release.apk
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
SDK="${ANDROID_HOME:-$HOME/android-sdk}"
BT="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-34"
BUILD="$ANDROID_DIR/_build"

# JDK 定位：优先 $JAVA_HOME，其次 ~/jdk17，再退回系统 javac
if [ -x "${JAVA_HOME:-}/bin/javac" ]; then
  JAVAC="${JAVA_HOME}/bin/javac"
  KEYTOOL="${JAVA_HOME}/bin/keytool"
elif [ -x "$HOME/jdk17/bin/javac" ]; then
  JAVAC="$HOME/jdk17/bin/javac"
  KEYTOOL="$HOME/jdk17/bin/keytool"
else
  JAVAC="$(command -v javac || true)"
  KEYTOOL="$(command -v keytool || true)"
fi
if [ -z "${JAVAC:-}" ]; then
  echo "错误：未找到 javac，请安装 JDK 11+ 或设置 JAVA_HOME" >&2
  exit 1
fi
echo "使用 javac: $JAVAC"

echo "[1/7] 构建网页资源 (npm run build) ..."
(cd "$ROOT" && npm run build >/dev/null 2>&1)
echo "     完成 -> $ROOT/dist"

echo "[2/7] 准备 APK assets（网页资源 + AI 模型 + wasm）..."
rm -rf "$BUILD"
mkdir -p "$BUILD/assets" "$BUILD/gen" "$BUILD/classes" "$BUILD/dex"
cp -r "$ROOT"/dist/* "$BUILD/assets/"
echo "     assets: $(du -sh "$BUILD/assets" | cut -f1)"

echo "[3/7] 编译资源 (aapt2) ..."
# 若图标 PNG 缺失（例如从 GitHub 克隆的仓库），从 base64 副本自动还原
for d in hdpi xhdpi xxhdpi xxxhdpi; do
  PNG="$ANDROID_DIR/res/mipmap-$d/ic_launcher.png"
  B64="$ANDROID_DIR/res/mipmap-$d/ic_launcher.png.b64"
  if [ ! -f "$PNG" ] && [ -f "$B64" ]; then
    python3 - "$B64" "$PNG" <<'PYEOF'
import base64, sys
with open(sys.argv[1]) as f: data = base64.b64decode(f.read().strip())
with open(sys.argv[2], 'wb') as f: f.write(data)
PYEOF
    echo "     已从 base64 还原图标 $d"
  fi
done
"$BT/aapt2" compile --dir "$ANDROID_DIR/res" -o "$BUILD/res.zip"
"$BT/aapt2" link \
  -o "$BUILD/app.unsigned.apk" \
  -I "$PLATFORM/android.jar" \
  --manifest "$ANDROID_DIR/AndroidManifest.xml" \
  -R "$BUILD/res.zip" \
  --java "$BUILD/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 34 \
  --version-code 1 \
  --version-name "1.0.0" \
  --auto-add-overlay
echo "     资源编译链接完成"

echo "[4/7] 编译 Java 并转 dex (javac + d8) ..."
"$JAVAC" -source 11 -target 11 \
  -classpath "$PLATFORM/android.jar" \
  -d "$BUILD/classes" \
  "$ANDROID_DIR/java/com/goodgym/aifitness/MainActivity.java"
"$BT/d8" --lib "$PLATFORM/android.jar" --release --min-api 24 \
  --output "$BUILD/dex" \
  "$BUILD"/classes/com/goodgym/aifitness/*.class
echo "     dex 生成完成"

echo "[5/7] 打包 dex + assets 进 APK ..."
cp "$BUILD/dex/classes.dex" "$BUILD/classes.dex"
(cd "$BUILD" && zip -q -j app.unsigned.apk classes.dex)
(cd "$BUILD" && zip -q -r app.unsigned.apk assets)
echo "     APK 体积: $(du -h "$BUILD/app.unsigned.apk" | cut -f1)"

echo "[6/7] 对齐 (zipalign) ..."
"$BT/zipalign" -p -f 4 "$BUILD/app.unsigned.apk" "$BUILD/app.aligned.apk"

echo "[7/7] 签名 (apksigner) ..."
KEYSTORE="$ANDROID_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  "$KEYTOOL" -genkeypair -v -keystore "$KEYSTORE" \
    -alias goodgym -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=AI Fitness, OU=Dev, O=GoodGym, L=Guangzhou, S=GD, C=CN" >/dev/null 2>&1
fi
"$BT/apksigner" sign \
  --ks "$KEYSTORE" --ks-key-alias goodgym \
  --ks-pass pass:android --key-pass pass:android \
  --out "$ANDROID_DIR/app-release.apk" \
  "$BUILD/app.aligned.apk"

echo ""
echo "========================================"
echo "构建完成: $ANDROID_DIR/app-release.apk"
"$BT/apksigner" verify --print-certs "$ANDROID_DIR/app-release.apk" | head -5
echo "========================================"
