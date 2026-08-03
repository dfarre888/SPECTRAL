SPECTRAL layout — Desktop primary + OneDrive backup
Updated: 29 Jul 2026

LIVE PROJECT (day-to-day):
  ~/Desktop/SPECTRAL
  - Run npm / next / Cursor from here only
  - Full git history (GitHub origin)
  - Local node_modules (do not put on OneDrive)

ONEDRIVE COPY (source backup only):
  ~/Library/CloudStorage/OneDrive-Personal/SPECTRAL
  - Source + .git backup
  - NEVER npm install or npm run dev here
  - Exclude node_modules and .next always

BACKUP COMMAND:
  ~/Desktop/SPECTRAL/scripts/sync-to-onedrive.sh

REAL SOURCE OF TRUTH:
  git push → https://github.com/dfarre888/SPECTRAL.git

WHY NOT ONEDRIVE AS LIVE TREE:
  File Provider breaks node_modules symlinks and stalls rsync/npm.

OPTIONAL CLEANUP:
  rm -rf ~/Desktop/SPECTRAL-working-files   # leftover from first migrate
  rm -rf /tmp/spectral-work                # old ephemeral worktree

OPEN IN CURSOR:
  File → Open Folder → ~/Desktop/SPECTRAL
