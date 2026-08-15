#!/usr/bin/env python3
"""Upsert A3DM COTS DJI airframes into platforms (idempotent).

Map Intel reads `platforms`. DJI was in the JSON catalog only — this writes
the rows the globe picker actually queries.

Missing range/speed → 5 km / 12 m/s (43.2 km/h). Estimated, not Confirmed.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DRONES = json.loads((ROOT / "data/a3dm/drones.json").read_text())
MFRS = {m["id"]: m for m in json.loads((ROOT / "data/a3dm/manufacturers.json").read_text())}

FALLBACK_RANGE_KM = 5
FALLBACK_SPEED_KMH = 12 * 3.6  # 43.2

FAMILIES = [
    (re.compile(r"mavic.?3|dji-mavic-3", re.I), {"range_km": 15, "speed_kmh": 75, "ceiling_m": 6000, "endurance_hrs": 0.77}),
    (re.compile(r"matrice.?350|dji-matrice-350", re.I), {"range_km": 20, "speed_kmh": 83, "ceiling_m": 7000, "endurance_hrs": 0.92}),
    (re.compile(r"matrice.?300|dji-matrice-300", re.I), {"range_km": 15, "speed_kmh": 83, "ceiling_m": 5000, "endurance_hrs": 0.92}),
    (re.compile(r"matrice.?30(?!0)|dji-matrice-30", re.I), {"range_km": 15, "speed_kmh": 83, "ceiling_m": 7000, "endurance_hrs": 0.68}),
    (re.compile(r"mavic.?2|phantom.?4|inspire", re.I), {"range_km": 8, "speed_kmh": 72, "ceiling_m": 6000, "endurance_hrs": 0.52}),
    (re.compile(r"mini.?[234]|air.?[23]", re.I), {"range_km": 10, "speed_kmh": 57, "ceiling_m": 4000, "endurance_hrs": 0.52}),
]


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    local = ROOT / ".env.local"
    if local.exists():
        for line in local.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def perf_for(drone: dict) -> dict:
    hay = f"{drone['id']} {drone['name']}"
    for rx, perf in FAMILIES:
        if rx.search(hay):
            return dict(perf)
    return {
        "range_km": FALLBACK_RANGE_KM,
        "speed_kmh": FALLBACK_SPEED_KMH,
        "ceiling_m": 500,
        "endurance_hrs": 0.33,
    }


def grams_to_kg(g) -> float | None:
    if g is None:
        return None
    return round(float(g) / 1000.0, 3)


def country_for(drone: dict) -> str:
    raw = (MFRS.get(drone["manufacturer_id"], {}).get("country") or "China")
    return raw.split("/")[0].strip() or "China"


def row_for(drone: dict) -> dict:
    perf = perf_for(drone)
    sub = drone.get("sub_category")
    name = (
        f"{drone['manufacturer']} {drone['name']} ({sub})"
        if sub and sub != "Standard"
        else f"{drone['manufacturer']} {drone['name']}"
    )
    retired = bool(re.search(r"discontinued|superseded|retired", drone.get("notes") or "", re.I))
    estimated = perf["range_km"] == FALLBACK_RANGE_KM
    return {
        "id": drone["id"],
        "name": name,
        "manufacturer": drone["manufacturer"],
        "country_of_origin": country_for(drone),
        "nato_reporting_name": None,
        "category": "cots",
        "guidance_type": "INS+GPS",
        "gnss_independent": False,
        "ai_autonomous": False,
        "swarm_capable": False,
        "intel_update_date": "2026-08-15",
        "max_speed_kmh": perf["speed_kmh"],
        "service_ceiling_m": perf["ceiling_m"],
        "range_km": perf["range_km"],
        "endurance_hrs": perf["endurance_hrs"],
        "mtow_kg": grams_to_kg(drone.get("mtow_g")) or grams_to_kg(drone.get("dry_weight_g")),
        "warhead_kg": None,
        "itar_controlled": False,
        "data_confidence": "estimated" if estimated else "medium",
        "sources": [
            "A3DM RPAS Database (shared catalog)",
            "Map envelope: OSINT family match or estimated 5 km / 12 m/s",
        ],
        "gnss_used": ["GPS"],
        "rtk_capable": bool(re.search(r"rtk", f"{drone['name']} {sub or ''}", re.I)),
        "nav_backup": ["optical flow", "INS"],
        "stealth_features": [],
        "weapon_types": [],
        "sensor_suite": [],
        "known_operators": [],
        "conflict_deployments": [],
        "year_introduced": drone.get("year_released"),
        "propulsion": "electric",
        "engine_type": "electric",
        "defeat_note": "COTS Group 1–2: RF jam C2 (2.4/5.8 GHz) + GNSS spoof/deny; HPM; kinetic/DEW if RF-silent.",
        "control_link_freq": "2.4 / 5.8 GHz class (OcuSync / Lightbridge family)",
        "gnss_dependency": "high",
        "side": "neutral",
        "uas_group": drone.get("uas_group") or 1,
        "a3dm_drone_id": drone["a3dm_drone_id"],
        "dry_weight_kg": grams_to_kg(drone.get("dry_weight_g")),
        "max_payload_kg": grams_to_kg(drone.get("max_payload_g")),
        "a3dm_category": drone.get("a3dm_category"),
        "sub_category": sub,
        "catalog_tier": "cots",
        "retired": retired,
        "classification": "UNCLASSIFIED",
        "source": "osint",
    }


def dji_drones() -> list[dict]:
    return [d for d in DRONES if str(d.get("manufacturer", "")).strip().upper() == "DJI"]


def upsert(env: dict[str, str], rows: list[dict]) -> None:
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    url = base + "/rest/v1/platforms?on_conflict=id"
    raw = json.dumps(rows).encode()
    req = urllib.request.Request(
        url,
        data=raw,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(f"upsert_ok status={resp.status} n={len(rows)}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:800]
        print(f"upsert_err status={e.code} body={body}", file=sys.stderr)
        raise


def main() -> int:
    env = load_env()
    if not env.get("NEXT_PUBLIC_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        print("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 2
    rows = [row_for(d) for d in dji_drones()]
    print(f"dji_catalog={len(rows)}")
    # batch to stay under payload limits
    for i in range(0, len(rows), 40):
        upsert(env, rows[i : i + 40])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
