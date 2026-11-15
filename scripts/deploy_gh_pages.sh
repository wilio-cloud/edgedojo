#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
npm run build:gh

REPO_URL="$(git remote get-url origin)"
TMP_DIR="$(mktemp -d)"
cp -R dist/. "$TMP_DIR/"

pushd "$TMP_DIR" >/dev/null
git init -b gh-pages
git add -A
git commit -m "Deploy EdgeDojo PWA to GitHub Pages"
git push --force "$REPO_URL" gh-pages:gh-pages
popd >/dev/null

rm -rf "$TMP_DIR"
# Rebuild local base='/' dist so local vite preview also stays intact
npm run build >/dev/null
echo "[OK] Deployed to https://wilio-cloud.github.io/edgedojo/"
