#!/usr/bin/env python3
"""Upsert the full A3DM COTS catalog into Map Intel tables.

Writes platforms (314 drones), manufacturers, payloads, and compatibility.
Missing range/speed → 5 km / 12 m/s. Payload names go on sensor_suite so
the map picker can search them.
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
PAYLOADS = json.loads((ROOT / "data/a3dm/payloads.json").read_text())
COMPAT = json.loads((ROOT / "data/a3dm/compatibility.json").read_text())
MFRS = json.loads((ROOT / "data/a3dm/manufacturers.json").read_text())
MFR_BY_ID = {m["id"]: m for m in MFRS}

FALLBACK_RANGE_KM = 5
FALLBACK_SPEED_KMH = 12 * 3.6

FAMILIES = [
    (re.compile(r"mavic.?3|dji-mavic-3", re.I), {"range_km": 15, "speed_kmh": 75, "ceiling_m": 6000, "endurance_hrs": 0.77}),
    (re.compile(r"matrice.?350|dji-matrice-350", re.I), {"range_km": 20, "speed_kmh": 83, "ceiling_m": 7000, "endurance_hrs": 0.92}),
    (re.compile(r"matrice.?300|dji-matrice-300", re.I), {"range_km": 15, "speed_kmh": 83, "ceiling_m": 5000, "endurance_hrs": 0.92}),
    (re.compile(r"matrice.?30(?!0)|dji-matrice-30", re.I), {"range_km": 15, "speed_kmh": 83, "ceiling_m": 7000, "endurance_hrs": 0.68}),
    (re.compile(r"evo.?max|autel-evo-max", re.I), {"range_km": 20, "speed_kmh": 65, "ceiling_m": 7010, "endurance_hrs": 0.7}),
    (re.compile(r"skydio.?x10", re.I), {"range_km": 12, "speed_kmh": 72, "ceiling_m": 4500, "endurance_hrs": 0.67}),
    (re.compile(r"wingtra", re.I), {"range_km": 10, "speed_kmh": 58, "ceiling_m": 5000, "endurance_hrs": 0.98}),
    (re.compile(r"ebee|sensefly", re.I), {"range_km": 8, "speed_kmh": 110, "ceiling_m": 3000, "endurance_hrs": 1.5}),
    (re.compile(r"anafi", re.I), {"range_km": 4, "speed_kmh": 55, "ceiling_m": 4500, "endurance_hrs": 0.53}),
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
    raw = (MFR_BY_ID.get(drone["manufacturer_id"], {}).get("country") or drone.get("manufacturer") or "Multi")
    return str(raw).split("/")[0].strip() or "Multi"


def payloads_for(platform_id: str) -> list[dict]:
    ids = [c["payload_id"] for c in COMPAT if c.get("platform_id") == platform_id]
    by_id = {p["id"]: p for p in PAYLOADS}
    return [by_id[i] for i in ids if i in by_id]


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
    fitted = payloads_for(drone["id"])
    if fitted:
        shown = ", ".join(p["name"] for p in fitted[:4])
        extra = f" +{len(fitted) - 4}" if len(fitted) > 4 else ""
        name = f"{name} · {shown}{extra}"
    return {
        "id": drone["id"],
        "name": name,
        "manufacturer": drone["manufacturer"],
        "country_of_origin": country_for(drone),
        "nato_reporting_name": None,
        "category": "cots",
        "guidance_type": "INS+GPS",
        "gnss_independent": False,
        "ai_autonomous": bool(re.search(r"skydio|autonomous", f"{drone['name']} {drone.get('notes') or ''}", re.I)),
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
        "sensor_suite": [f"{p['name']} ({p['type']})" for p in fitted],
        "known_operators": [],
        "conflict_deployments": [],
        "year_introduced": drone.get("year_released"),
        "propulsion": "electric",
        "engine_type": "electric",
        "defeat_note": "COTS Group 1–2: RF jam C2 (2.4/5.8 GHz class) + GNSS spoof/deny; HPM; kinetic/DEW if RF-silent.",
        "control_link_freq": "2.4 / 5.8 GHz class COTS C2",
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


def rest(env: dict[str, str], path: str, rows: list[dict], conflict: str) -> None:
    if not rows:
        return
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    url = f"{base}/rest/v1/{path}?on_conflict={conflict}"
    req = urllib.request.Request(
        url,
        data=json.dumps(rows).encode(),
        method="POST",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            print(f"upsert_ok {path} status={resp.status} n={len(rows)}")
    except urllib.error.HTTPError as e:
        print(f"upsert_err {path} status={e.code} body={e.read().decode()[:800]}", file=sys.stderr)
        raise


def batches(rows: list[dict], n: int = 40):
    for i in range(0, len(rows), n):
        yield rows[i : i + n]


def manufacturer_rows() -> list[dict]:
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "country": m.get("country"),
            "type": m.get("type"),
            "website": m.get("website"),
            "notes": m.get("notes"),
        }
        for m in MFRS
    ]


def payload_rows() -> list[dict]:
    return [
        {
            "id": p["id"],
            "manufacturer_id": p.get("manufacturer_id"),
            "name": p["name"],
            "type": p["type"],
            "weight_g": p.get("weight_g"),
            "mount_type": p.get("mount_type"),
            "notes": p.get("notes"),
            "spectrum_eligible": bool(p.get("spectrum_eligible", True)),
        }
        for p in PAYLOADS
    ]


def compat_rows() -> list[dict]:
    out = []
    for c in COMPAT:
        pid = c.get("platform_id")
        if not pid:
            continue
        out.append(
            {
                "id": c["id"],
                "platform_id": pid,
                "payload_id": c["payload_id"],
                "a3dm_drone_id": c.get("a3dm_drone_id"),
                "notes": c.get("notes"),
            }
        )
    return out


def main() -> int:
    env = load_env()
    if not env.get("NEXT_PUBLIC_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        print("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 2

    platforms = [row_for(d) for d in DRONES]
    print(f"a3dm_drones={len(platforms)} payloads={len(PAYLOADS)} compat={len(COMPAT)} mfrs={len(MFRS)}")

    for chunk in batches(manufacturer_rows(), 50):
        rest(env, "manufacturers", chunk, "id")
    for chunk in batches(payload_rows(), 50):
        rest(env, "payloads", chunk, "id")
    for chunk in batches(platforms, 40):
        rest(env, "platforms", chunk, "id")
    for chunk in batches(compat_rows(), 50):
        rest(env, "platform_payload_compatibility", chunk, "id")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
