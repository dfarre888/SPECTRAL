#!/bin/bash
# Install or remove the daily Watchfloor refresh (macOS launchd).
#   scripts/intel-schedule.sh install [HH:MM]   default 05:30 local time
#   scripts/intel-schedule.sh remove
#   scripts/intel-schedule.sh status
set -euo pipefail

LABEL="au.spectral.intel-daily"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-status}" in
  install)
    time="${2:-05:30}"
    hour="$((10#${time%%:*}))"
    minute="$((10#${time##*:}))"
    mkdir -p "$HOME/Library/LaunchAgents"
    cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/scripts/intel-daily.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>SPECTRAL_REPO</key><string>$REPO</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$hour</integer><key>Minute</key><integer>$minute</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/spectral-intel.launchd.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/spectral-intel.launchd.log</string>
</dict>
</plist>
PLIST
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    echo "Installed: the Watchfloor refreshes daily at $time local time. Log: ~/Library/Logs/spectral-intel.log"
    ;;
  remove)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Removed the daily Watchfloor refresh."
    ;;
  status)
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
      echo "Scheduled ($PLIST)"
    else
      echo "Not scheduled"
    fi
    ;;
  *) echo "usage: $0 install [HH:MM] | remove | status"; exit 1 ;;
esac
