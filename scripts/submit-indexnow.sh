#!/usr/bin/env bash
set -euo pipefail

KEY="08fd9aa6-1f10-4216-8ee7-3e2a063d225b"
BASE="https://heicpdf.to"
API="https://api.indexnow.org/indexnow"

URLS=(
  ""
  "/fr"
  "/blog"
  "/fr/blog"
  "/blog/how-to-convert-heic-to-pdf"
  "/fr/blog/how-to-convert-heic-to-pdf"
  "/privacy"
  "/fr/privacy"
  "/terms"
  "/fr/terms"
)

echo "Submitting ${#URLS[@]} URLs to IndexNow..."
echo ""

for path in "${URLS[@]}"; do
  url="${BASE}${path}"
  encoded=$(echo -n "$url" | perl -MURI::Escape -ne 'chomp; print uri_escape($_)')
  # fallback: use python3 if perl not available
  if [ -z "$encoded" ]; then
    encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url', safe=''))" 2>/dev/null || echo "$url")
  fi
  req="${API}?url=${encoded}&key=${KEY}"
  echo "→ $url"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$req" 2>&1 || echo "FAILED")
  if [ "$status" = "200" ] || [ "$status" = "202" ]; then
    echo "  ✓ $status"
  else
    echo "  ✗ $status"
  fi
done

echo ""
echo "Done."
