#!/usr/bin/env python3
"""Rewrite .env.local to the Sydney Supabase project.

Does not write keys. If the file still has Mumbai URL or Mumbai JWTs, it
replaces the URL and prints the dashboard path for the two Sydney keys.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV = ROOT / ".env.local"

SYDNEY_REF = "nxnukrnkbxiqberymqzq"
SYDNEY_URL = f"https://{SYDNEY_REF}.supabase.co"
MUMBAI_REF = "wzsoajpvcoesgsmuwuwm"
DASH = f"https://supabase.com/dashboard/project/{SYDNEY_REF}/settings/api"


def main() -> int:
    if not ENV.exists():
        print(f"missing {ENV} — copy .env.local.example first", file=sys.stderr)
        return 2
    text = ENV.read_text()
    had_mumbai = MUMBAI_REF in text
    text2 = re.sub(
        r"^NEXT_PUBLIC_SUPABASE_URL=.*$",
        f"NEXT_PUBLIC_SUPABASE_URL={SYDNEY_URL}",
        text,
        flags=re.M,
    )
    if "NEXT_PUBLIC_SUPABASE_URL=" not in text2:
        text2 = f"NEXT_PUBLIC_SUPABASE_URL={SYDNEY_URL}\n" + text2
    if text2 != text:
        ENV.write_text(text2)
        print(f"wrote {ENV} URL → {SYDNEY_URL}")
    else:
        print(f"URL already {SYDNEY_URL}" if SYDNEY_REF in text2 else "URL line unchanged")

    if MUMBAI_REF in text2:
        print(
            f"WARNING: Mumbai key material still in .env.local. Replace ANON and SERVICE_ROLE from:\n  {DASH}",
            file=sys.stderr,
        )
        return 1
    if had_mumbai:
        print(f"Removed Mumbai URL. Confirm ANON + SERVICE_ROLE are Sydney keys:\n  {DASH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
