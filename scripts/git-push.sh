#!/usr/bin/env bash
set -euo pipefail

echo "=== Status Saat Ini ==="
git status

echo ""
read -r -p "Commit message: " msg

if [ -z "$msg" ]; then
    echo "Batal: pesan kosong"
    exit 1
fi

git add .
git commit -m "$msg"
git push

echo ""
echo "Done! Pushed with: $msg"
