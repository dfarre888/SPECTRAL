#!/bin/bash
# Paste the SPECTRAL Supabase keys into .env.local without them appearing on
# screen, in shell history or anywhere else. Legacy JWT keys are checked
# against the project before anything is written; the old file is backed up.
# Project: SPECTRAL, org "Spectral" (free plan), ap-southeast-2 (Sydney).
#
#   bash scripts/set-supabase-keys.sh
set -uo pipefail

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
REF="${SUPABASE_REF:-ewmonpfznutfviouqdbr}"
DASH="https://supabase.com/dashboard/project/$REF/settings/api"

echo
echo "Supabase keys for SPECTRAL (project $REF)"
echo "Copy each key from: $DASH"
echo "Paste it at the prompt and press Return. Nothing will show as you paste; that is normal."
echo

check() {
  # $1 = expected role (anon | service_role); key read from $KEY
  KEY="$KEY" ROLE="$1" REF="$REF" python3 - <<'PY'
import base64, json, os, sys
key, role, ref = os.environ["KEY"].strip(), os.environ["ROLE"], os.environ["REF"]
if key.startswith("sb_publishable_") and role == "anon":
    print("  looks like a new-style publishable key (project cannot be checked from the key itself)"); sys.exit(0)
if key.startswith("sb_secret_") and role == "service_role":
    print("  looks like a new-style secret key (project cannot be checked from the key itself)"); sys.exit(0)
parts = key.split(".")
if len(parts) != 3:
    print("  that does not look like a Supabase key. Try copying it again."); sys.exit(1)
try:
    p = parts[1] + "=" * (-len(parts[1]) % 4)
    claims = json.loads(base64.urlsafe_b64decode(p))
except Exception:
    print("  could not read that key. Try copying it again."); sys.exit(1)
if claims.get("ref") != ref:
    print(f"  that key belongs to project {claims.get('ref')}, not SPECTRAL ({ref})."); sys.exit(1)
if claims.get("role") != role:
    print(f"  that is the {claims.get('role')} key; this prompt needs the {role} key."); sys.exit(1)
print(f"  OK: {role} key for {ref}")
PY
}

ask() {
  # $1 = label, $2 = role; sets the variable named by $3
  local label="$1" role="$2" var="$3"
  while true; do
    printf "%s: " "$label"
    IFS= read -rs KEY
    echo
    if [ -z "$KEY" ]; then echo "  nothing pasted, try again"; continue; fi
    if check "$role"; then
      printf -v "$var" '%s' "$KEY"
      break
    fi
  done
}

ask "Paste the anon (public) key" anon ANON_KEY
ask "Paste the service_role (secret) key" service_role SERVICE_KEY

cp -p "$ENV_FILE" "$ENV_FILE.before-key-switch.bak"

ANON_KEY="$ANON_KEY" SERVICE_KEY="$SERVICE_KEY" ENV_FILE="$ENV_FILE" REF="$REF" python3 - <<'PY'
import os, re
path, ref = os.environ["ENV_FILE"], os.environ["REF"]
text = open(path).read()
def put(text, name, value):
    line = f"{name}={value}"
    if re.search(rf"^{name}=.*$", text, flags=re.M):
        return re.sub(rf"^{name}=.*$", lambda _m: line, text, flags=re.M)
    return line + "\n" + text
text = put(text, "SUPABASE_SERVICE_ROLE_KEY", os.environ["SERVICE_KEY"].strip())
text = put(text, "NEXT_PUBLIC_SUPABASE_ANON_KEY", os.environ["ANON_KEY"].strip())
text = put(text, "NEXT_PUBLIC_SUPABASE_URL", f"https://{ref}.supabase.co")
text = re.sub(r"^# Supabase.*$", f"# Supabase: SPECTRAL ({ref}, ap-southeast-2)", text, count=1, flags=re.M)
open(path, "w").write(text)
PY

unset ANON_KEY SERVICE_KEY KEY
echo
echo "Done. .env.local now points at $REF with its keys."
echo "Previous file saved as .env.local.before-key-switch.bak"
echo "You can close this tab and tell Claude \"done\"."
