# SPECTRAL PCM — WOPR Adjudication Tables
**Classification:** UNCLASSIFIED // SPECTRAL PCM — FOR OFFICIAL TRAINING USE ONLY
**Version:** 1.0 | For DS use only — not distributed to players

---

## How to Use These Tables

The Referee Claude instance uses these tables to adjudicate outcomes after each turn's decisions are submitted. Roll a d10 (or use Claude's random number generation) and compare against the probability threshold. Below threshold = success; at or above = failure.

**d10 roll:** 1–10. Probability of 70% = success on roll of 1–7, failure on 8–10.

---

## Table 1 — RF Jamming Effectiveness

| Platform Type | Comms Type | Jammer Power | Jamming Effectiveness |
|---|---|---|---|
| FPV (commercial RC) | 2.4GHz / 5.8GHz | Low (DroneShield) | 90% |
| FPV (commercial RC) | 2.4GHz / 5.8GHz | High (military EW) | 98% |
| FPV (fibre-optic link) | Physical cable | Any RF jammer | 0% — RF jamming ineffective |
| Shahed-136 OWA | Pre-programmed INS+GPS | RF jammer (GNSS) | 40% (GPS-dependent nav only) |
| Shahed-136 OWA | Pre-programmed INS+GPS | GNSS spoofer | 60% — may redirect, not destroy |
| MALE (TB-2, MQ-9) | SATCOM/LOS datalink | Low jammer | 20% |
| MALE (TB-2, MQ-9) | SATCOM/LOS datalink | High military EW | 60% |
| Loitering munition (autonomous) | Autonomous terminal | Any RF jammer | 10% — AI guidance bypasses RF |

**Modifier — EMCON:** If platform is in EMCON (not radiating), apply -30% to jamming effectiveness (less signal to target).

---

## Table 2 — Kinetic Intercept Probability (Pk)

| Interceptor | Target Type | Pk |
|---|---|---|
| Patriot PAC-3 | MALE/HALE UAS | 85% |
| Patriot PAC-3 | OWA / Shahed-class | 70% |
| IRIS-T SLM | OWA / Shahed-class | 75% |
| Coyote Block 3 | sUAS / FPV | 80% |
| SHORAD (Stinger) | MALE UAS | 60% |
| SHORAD (Stinger) | sUAS / FPV | 25% (small, fast, low) |
| 23mm ZU-23-2 (manual) | sUAS / FPV swarm | 15% per round per target |
| Small arms (rifle) | sUAS / FPV | 5% (moving, small) |
| DroneGun / net system | sUAS / FPV | 70% within 500m |
| Laser DEW (HELIOS-class) | sUAS / FPV | 95% within 1km, clear air |
| Laser DEW (HELIOS-class) | sUAS / FPV | 40% in dust/rain/smoke |

**Modifier — Swarm:** For every 3 simultaneous inbound beyond defender's fire control capacity, apply -20% Pk per target (cognitive and fire control saturation).

**Modifier — Altitude:** sUAS at <50m AGL: apply -15% to all kinetic Pk (terrain masking, engagement geometry).

---

## Table 3 — Detection Probability by Sensor Type

### Radar Detection

| Platform Type | RCS | Radar Type | Detection Range | Probability at Range |
|---|---|---|---|---|
| MALE (MQ-9) | Medium | Military 3D radar | 120km | 95% |
| OWA / Shahed-class | Small-medium | Military 3D radar | 40km | 80% |
| OWA / Shahed-class | Small-medium | SHORAD radar | 15km | 70% |
| FPV / sUAS | Very small | Military 3D radar | 5km | 40% |
| FPV / sUAS | Very small | SHORAD radar | 2km | 60% |
| Low-RCS UAS (GJ-11 class) | Very low | Military 3D radar | 15km | 30% |

**Modifier — terrain:** Urban/cluttered terrain: apply -30% to all radar Pk at low altitude (<200m AGL).

### EO/IR Detection

| Condition | Target | Detection Range |
|---|---|---|
| Daylight, clear | MALE UAS | 20km (EO) |
| Daylight, clear | FPV / sUAS | 3km (EO) |
| Night, clear | MALE UAS | 15km (IR) |
| Night, clear | FPV / sUAS | 2km (IR) |
| Overcast / rain | Any | -50% range |
| Dust storm | Any | -80% range |
| Urban background clutter | sUAS | -40% range |

### RF/SIGINT Detection

| Platform State | Detection |
|---|---|
| Actively transmitting (datalink, RC, telemetry) | Detectable at 5–30km depending on emitter power |
| EMCON (pre-programmed, no TX) | Not detectable by RF/SIGINT |
| Fibre-optic FPV | Not detectable by RF/SIGINT at all |
| GNSS receiver (passive) | Not detectable (receive-only) |

---

## Table 4 — Weapon Effects

| Weapon | Target | Effect | Probability |
|---|---|---|---|
| Shahed-136 warhead (50kg HE) | Soft vehicle/equipment | Destroyed | 85% direct hit |
| Shahed-136 warhead | Hardened target | Damaged | 40% |
| Lancet-3 warhead (3kg shaped) | Light armoured vehicle | Mission kill | 70% |
| Lancet-3 warhead | MBT | Mobility kill | 50% |
| FPV grenade drop | Dismount/open vehicle | Casualty | 60% |
| FPV body (kamikaze) | Soft vehicle | Destroyed | 75% |
| Hellfire AGM-114R | Light vehicle | Destroyed | 95% |
| GBU-12 (500lb) | Building | Destroyed | 90% |
| GBU-12 | Dispersed infantry | Effect suppression only | 40% |

**Modifier — EW degradation on guidance:** If target platform's guidance is degraded by jamming (see Table 1), apply -20% to weapon effect probability.

---

## Table 5 — EW Spectrum Effects

| Effect | Duration | Recovery |
|---|---|---|
| GPS jamming (platform affected) | While jammer active | Platform reverts to INS only — navigation drift of ~100m/hr |
| GPS spoofing (platform affected) | While spoofer active | Platform follows false position — may self-navigate into friendly territory |
| Datalink degraded | While jammer active | Platform goes autonomous (last waypoint or loiter) |
| Datalink lost | >30 sec degraded | Platform executes lost-link procedure (RTB or loiter) |
| SIGINT detection | Instantaneous | Platform position known to detector |

---

## Table 6 — Turn Outcome Summary Sheet

DS fills this in after each turn:

```
Turn #: ___    Elapsed: ___ min

RED decisions this turn:
  Platform / Action / Outcome / World state update

BLUE decisions this turn:
  Platform / Action / Outcome / World state update

Inject issued: YES / NO — [Inject name if yes]

Score update:
  Red objectives: ___ / ___
  Blue objectives: ___ / ___
  Losses Red: ___  Blue: ___
  Civilian incidents: ___
  ROE flags: ___

Next turn sensor pictures generated: YES / NO
```
