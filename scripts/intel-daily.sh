#!/bin/bash
# Watchfloor daily refresh, run by launchd on the operator's CONNECTED machine.
#
# Builds today's incident bundle (signed when the signing key is present) and
# today's reporting window (news, official releases, analysis, advisories),
# then mirrors both to the OneDrive working copy so both copies of the app see
# the same picture. The deployed or air-gapped instance never runs this; it
# receives bundles by operator import.
#
# Install:   scripts/intel-schedule.sh install
# Remove:    scripts/intel-schedule.sh remove
set -euo pipefail

REPO="${SPECTRAL_REPO:-$HOME/dev/spectral}"
MIRROR="${SPECTRAL_MIRROR:-$HOME/Library/CloudStorage/OneDrive-Personal/SPECTRAL}"
LOG="$HOME/Library/Logs/spectral-intel.log"
export PATH="$HOME/.local/share/fnm/aliases/default/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

mkdir -p "$(dirname "$LOG")"
{
  echo "== $(date '+%Y-%m-%d %H:%M:%S %Z') Watchfloor refresh"
  cd "$REPO"
  npx tsx scripts/build-intel-bundle.ts --days 2 || echo "incident bundle failed; reporting continues"
  npx tsx scripts/build-watchfloor-reporting.ts --days 3 || echo "reporting collection failed"
  newest_rep="$(ls -1 data/intel/reporting/*.json 2>/dev/null | sort | tail -1)"
  # Sign the reporting window with the same ML-DSA-87 key as the incident bundle.
  if [ -n "$newest_rep" ] && [ -f "${SPECTRAL_INTEL_SIGNING_KEY:-$HOME/.spectral/keys/intel-signing.key}" ]; then
    npx tsx scripts/sign-intel-bundle.ts "$newest_rep" || echo "reporting signing failed; file left unsigned"
  fi
  if [ -n "$newest_rep" ] && [ -d "$MIRROR/data" ]; then
    mkdir -p "$MIRROR/data/intel/reporting"
    cp "$newest_rep" "$MIRROR/data/intel/reporting/"
  fi
  newest="$(ls -1 data/intel/bundles/*.json 2>/dev/null | sort | tail -1)"
  if [ -n "$newest" ] && [ -d "$MIRROR/data" ]; then
    mkdir -p "$MIRROR/data/intel/bundles"
    cp "$newest" "$MIRROR/data/intel/bundles/"
    base="${newest%.json}"
    for extra in "$base.sig" "$base.sig.json"; do
      [ -f "$extra" ] && cp "$extra" "$MIRROR/data/intel/bundles/"
    done
    echo "mirrored $(basename "$newest") to OneDrive"
  fi
  echo "== done"
} >>"$LOG" 2>&1
