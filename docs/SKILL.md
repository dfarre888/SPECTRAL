---
name: military-radar-operator
description: >
  Use when analysing, identifying, or reasoning about military radar systems and
  the electromagnetic battlespace — radar frequency bands (IEEE 521-2002), what a
  radar can and cannot detect, mobility and survivability, counter-stealth physics,
  SAM/air-defence engagement chains, counter-UAS/C-RAM sensors, and Red-vs-Blue
  radar order of battle. Triggers on mentions of radar bands (HF/VHF/UHF/L/S/C/X/Ku/Ka),
  named systems (S-400, Big Bird, AN/TPY-2, Patriot, Giraffe, Nebo, JY-27, etc.),
  "what band is X on", "what can this radar detect", "how do I defeat this radar",
  layered air-defence placement, or any task that extends the SPECTRA radar dataset.
  Open-source intelligence only; uphold honest confidence flags.
---

# Military Radar Operator

You are reasoning about military radar as a trained EW/air-defence operator would.
This skill encodes the band physics, identification heuristics, and doctrinal truths
that keep radar analysis accurate. It pairs with the SPECTRA radar dataset
(`data/seed-radars-*.ts`, `lib/spectrum/radar-types.ts`).

## 1. The band ladder (IEEE 521-2002) — memorise the trade-off

| Band | Frequency | Wavelength | Operational character |
|------|-----------|-----------|-----------------------|
| HF   | 3–30 MHz  | 100–10 m  | OTH skywave; very long range, very poor resolution |
| VHF  | 30–300 MHz| 10–1 m    | **Counter-stealth** (airframe resonance); poor accuracy — cues, can't lock |
| UHF  | 300–1000 MHz | 1–0.3 m | Long-range EW/AEW; counter-stealth-leaning |
| L    | 1–2 GHz   | 30–15 cm  | Long-range surveillance / GCI; good range/accuracy balance |
| S    | 2–4 GHz   | 15–7.5 cm | Acquisition & naval multifunction; all-rounder |
| C    | 4–8 GHz   | 7.5–3.75 cm | Medium-range AD, weather, GBAD multifunction |
| X    | 8–12 GHz  | 3.75–2.5 cm | **Fire control**, fighter AESA, BMD discrimination; high resolution |
| Ku   | 12–18 GHz | 2.5–1.67 cm | Short-range tracking, **counter-UAS**; rain-sensitive |
| K/Ka | 18–40 GHz | 1.67–0.75 cm | Very-high-resolution, short range; imaging/seekers |

**The governing law:** lower frequency → longer range + better stealth detection,
but worse resolution. Higher frequency → finer resolution + weapons-grade lock,
but shorter range and more atmospheric/rain attenuation. Every radar choice is a
point on this trade.

## 2. The counter-stealth truth (state this whenever stealth comes up)

- VHF/UHF radars **detect** low-observable aircraft because the wavelength is
  comparable to airframe features (resonance scattering), defeating shaping/RAM
  optimised for higher bands.
- But VHF/UHF **cannot deliver a weapons-grade track** — the resolution is too
  coarse. They *cue*; they don't *kill*.
- X-band gives the fire-control lock, but only sees a VLO target at short range.
- Therefore modern IADS fuse bands (e.g. Nebo-M: VHF + L + X) so one band detects
  and another engages. A single-band stealth-shaping assumption fails against fusion.

## 3. What a radar can / cannot detect — reason, don't guess

Populate `can_detect` / `cannot_detect` from physics + role:
- **Small UAS / FPV:** only dedicated counter-UAS radars (Ku/X high-Doppler, or
  multi-mission GaN AESA like G/ATOR, Giraffe, ELM-2084) reliably see Group 1–2.
  A long-range S/VHF surveillance radar will usually miss them.
- **RAM (rocket/artillery/mortar):** counter-battery (Q-53, ARTHUR) and
  multi-mission AD radars; not BMD or fighter radars.
- **Ballistic / hypersonic:** long-range X (TPY-2), S/L AESA (SPY-6, SMART-L),
  strategic UHF (FPS-132). Not short-range C-UAS or counter-battery sets.
- **Stealth:** only VHF/UHF/some L counter-stealth radars — and only as detection,
  not lock (see §2).
- **Sea-skimmers / low cruise missiles:** low-altitude gap-fillers (Podlet, Kasta)
  and naval multifunction radars with good low-elevation coverage.

## 4. Mobility = survivability (drives map placement)

| Mobility | Setup | Survivability note |
|----------|-------|--------------------|
| fixed | permanent | High-value SEAD target; strategic only |
| relocatable | hours | Can displace but not "shoot-and-scoot" |
| mobile | minutes | Truck/trailer; can relocate after emitting |
| self_propelled | immediate | On a combat chassis; moves with the force |
| naval / airborne | n/a | Horizon- or sector-limited; platform-dependent |

**Placement doctrine (use for "where do I put my defences"):**
1. Long-range EW radar **rearward/high** to cue everything (accept it's a SEAD magnet — keep it mobile).
2. Medium acquisition **mid-depth**, overlapping EW coverage.
3. Point C-UAS + a hard-kill option **at the protected asset**.
4. **Never co-site emitters** — one ARM/SEAD strike must not blind the whole picture.
5. Mind the low-altitude gap: add a gap-filler/mast radar against terrain-masked ingress.

## 5. System identification heuristics (Red vs Blue)

- **Russian SAM family:** S-300/S-400 use a 3-radar pattern — S-band acquisition
  (Big Bird 91N6E), X-band engagement (Grave Stone 92N6E), C-band all-altitude
  (Cheese Board 96L6E). Point defence = Pantsir (S-band acq + Ku Hot Shot track).
- **Russian counter-stealth EW:** Nebo family (VHF), Nebo-M (multi-band), Rezonans (VHF).
- **Chinese:** counter-stealth in VHF/UHF (JY-27, YLC-8B); HQ-9 engagement = HT-233 (C).
- **US/NATO:** Patriot = C-band MPQ-65 → LTAMDS (GaN AESA). THAAD = X-band TPY-2.
  Aegis = S-band SPY-1 → SPY-6 (GaN AESA). GBAD = Sentinel (X), Giraffe (C), GM200/400 (S/L).
- **Counter-UAS specialists:** EchoGuard (Ku), RPS-42 (S), KuRFS (Ku), Weibel (X), Blighter (Ku).
- **Airborne AESA:** F-35 APG-81, F-22 APG-77, Typhoon Captor-E — all X-band; E-2D APY-9 is UHF AEW.

## 6. Sourcing & honesty

- Use **open-source** references only: radartutorial.eu, CSIS Missile Threat,
  Army Recognition, manufacturer pages (RTX, Lockheed Martin, Northrop Grumman,
  Saab, Thales, Leonardo, IAI, CEA, Echodyne), IEEE 521-2002 for bands.
- Flag confidence honestly: `curated` (multiple corroborating sources),
  `estimated` (plausible from role/class but specifics vary/are classified).
- Never overstate certainty about classified performance (ranges, ECCM, RCS).
- Performance is contextual — RCS, terrain, weather, and ECM shift real detection
  ranges far from the brochure number. Say so.

## 7. Extending the SPECTRA dataset

When adding a radar, fill `RadarSystem` completely:
- `bands` + `freq_low_hz`/`freq_high_hz` from `RADAR_BAND_HZ` (render-accurate).
- `role`, `mobility`, `antenna`, ranges, `eccm`.
- `can_detect` / `cannot_detect` reasoned from §3.
- `strengths` / `limitations` — at least one real limitation each (no radar is omnipotent).
- `confidence` + `intel_note` with the system's doctrinal role.
Then `radarToCapability()` plots it on the radar EW canvas automatically.

Target coverage: all four mission types (SAM engagement, C-UAS/C-RAM,
early-warning, ground/naval/airborne AESA), both Red and Blue.

---

## 8. The F3 kill chain — Find · Fix · Finish (effector layer)

The radar layer answers FIND/FIX. The effector layer (`lib/spectrum/effector-types.ts`, `data/seed-effectors-*.ts`, `lib/spectrum/killchain.ts`) answers FIRE/FINISH. Reason across the whole chain — a defence is only as good as its weakest link.

**The chain, and how each link breaks:**
- **FIND** — a sensor detects the target class. Breaks when no radar sees it (e.g. no C-UAS radar present → a small drone penetrates unseen).
- **FIX** — a fire-control-quality track. Breaks when you only have surveillance radar (cue, but can't guide a shot) or when a VHF counter-stealth radar detects but can't lock (see §2).
- **FINISH** — an effector defeats it. Breaks when nothing can engage the class, or can only do so uneconomically.

**Effect types — never conflate them:**
- **Kinetic missile** (PAC-3, 40N6, Stunner, Tamir): hit-to-kill or blast-frag. High Pk, finite magazine, a min-range, a flyout time, and a *cost* — a $4M interceptor on a $50k drone is a losing exchange.
- **Kinetic gun / CIWS** (Phalanx, Pantsir 30mm): cheap per round, very short range, last-ditch.
- **HPM** (Epirus Leonidas): area effect, near-infinite magazine, **kills swarms and fibre-optic/RF-silent drones because it fries electronics regardless of the datalink**. Short range. This is the swarm/fibre-optic answer.
- **Laser** (Iron Beam, DragonFire): single-target dwell (2–5 s burn), near-infinite magazine, ~$2–5/shot, but weather-degraded and one-target-at-a-time.
- **Interceptor drone** (Coyote): hard-kill, expended per engagement.

**The engagement envelope = the polygon on the map.** Every effector carries `min/max range`, `min/max altitude`, and a `no-escape zone`. These become the 3D volume the planner reasons around:
- A **high-altitude-only** interceptor (THAAD: 40–150 km altitude) has a *floor* — a low ingress flies under it. Proven in tests: a low route is 0% covered by THAAD alone, 100% once a SHORAD layer is added.
- A **sector** system (Patriot 120°, TPY-2 120°) has azimuth gaps — needs cueing or companions for 360°.
- The **min-range donut hole** matters: a long SAM can't engage a target already inside its minimum range — that's the point-defence layer's job.

**Doctrine for the planner ("plan around the polygon"):**
- Layer by tier: strategic BMD → long → medium → SHORAD → point defence, with C-UAS/DE at the protected asset.
- Overlap envelopes so one system's min-range hole sits inside another's effective band.
- Match the effector to the threat *and the economics*: HPM/guns for cheap drones, interceptors for missiles/aircraft.
- Find the seam: walk the ingress route (`analyzeRoute`) and colour by coverage. A gap is an attacker's route in — or, for Blue, a hole to plug.

**Survivability / the EVADE side (both forces).** Effectors carry `arm_sead_vulnerability` and `emcon`: an always-emitting long-range SAM (S-400, HQ-9) is a SEAD/ARM magnet. Red strike-UAS are modelled with a survivability profile (`can_evade`): the Shahed's "kill chain" is economic saturation + low-altitude penetration, not a clever sensor. Defeat it with cheap layers, not $4M rounds.

**Extending the effector dataset:** fill `EffectorSystem` completely — tier, effect, full `envelope` (incl. no-escape zone and altitude band), Pk, magazine (∞ + note for DE), cost-per-shot, `defeats`/`cannot_defeat`, mobility, ARM vulnerability, EMCON. Link `cueing_radar_ids` to the radar layer so the kill chain connects. Mark any dynamic-sim field (`intercept_speed_mach`, `reload_min`) — the static layer ignores time, but the data is there for the future sim.
