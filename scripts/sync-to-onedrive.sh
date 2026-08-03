#!/bin/bash
# One-way source backup: Desktop SPECTRAL → OneDrive SPECTRAL
# Never syncs node_modules / .next.
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin"

SRC="${HOME}/Desktop/SPECTRAL"
DST="${HOME}/Library/CloudStorage/OneDrive-Personal/SPECTRAL"

[[ -d "$SRC" ]] || { echo "Missing Desktop project: $SRC" >&2; exit 1; }
[[ -d "$DST" ]] || { echo "Missing OneDrive folder: $DST" >&2; exit 1; }

echo "Backing up source → OneDrive (excluding node_modules, .next, .git objects optional)…"
# Prefer ditto for File Provider reliability on large trees
for rel in app components lib data docs public supabase scripts brand assessments \
  package.json package-lock.json SPECTRAL-SYNC-README.txt README.md CLAUDE.md \
  .gitignore .env.local.example tsconfig.json; do
  [[ -e "$SRC/$rel" ]] || continue
  echo "→ $rel"
  if [[ -d "$SRC/$rel" ]]; then
    mkdir -p "$DST/$rel"
    ditto "$SRC/$rel" "$DST/$rel"
  else
    ditto "$SRC/$rel" "$DST/$rel"
  fi
done

echo "Done. Live worktree: $SRC"
echo "Dev only from Desktop:  cd ~/Desktop/SPECTRAL && npm run dev"
