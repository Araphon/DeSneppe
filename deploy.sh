#!/usr/bin/env bash
# Veilige deploy: bouwt in een aparte map en zet het resultaat daarna in één keer over.
# Oude JS-chunks blijven staan, zodat open tabbladen niet crashen tijdens/na een update.
set -euo pipefail
LIVE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$(dirname "$LIVE")/.sneppe-build"
LOG="$BUILD/build.log"

mkdir -p "$BUILD"
rsync -a --delete --exclude node_modules --exclude .next --exclude uploads --exclude tmp --exclude _plesk --exclude .git "$LIVE/" "$BUILD/"
ln -sfn "$LIVE/node_modules" "$BUILD/node_modules"

cd "$BUILD"
set -a; . ./.env; set +a
echo "→ Bouwen in $BUILD …"
if ! NODE_ENV=production NODE_OPTIONS=--max-old-space-size=1536 npx next build > "$LOG" 2>&1; then
  tail -40 "$LOG"; echo "✗ Build mislukt — live site NIET aangeraakt"; exit 1
fi
if grep -qE "Failed to compile|Type error" "$LOG"; then
  grep -E -A5 "Failed to compile|Type error" "$LOG"; echo "✗ Compilefout — live site NIET aangeraakt"; exit 1
fi

echo "→ Overzetten naar live …"
# Eerst statische bestanden (oude chunks blijven bestaan), daarna de servercode
mkdir -p "$LIVE/.next/static"
rsync -a "$BUILD/.next/static/" "$LIVE/.next/static/"
rsync -a --delete --exclude static --exclude cache "$BUILD/.next/" "$LIVE/.next/"
mkdir -p "$LIVE/tmp" && touch "$LIVE/tmp/restart.txt"

# Chunks ouder dan 7 dagen opruimen
find "$LIVE/.next/static" -type f -mtime +7 -delete 2>/dev/null || true
echo "✓ Live gezet ($(grep -oE 'Generating static pages \([0-9/]+\)' "$LOG" | tail -1))"
