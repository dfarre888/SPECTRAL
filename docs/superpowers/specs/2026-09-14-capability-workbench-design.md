# Capability Workbench — design

Replaces the Compare tab (`/force-catalog?tab=compare`) grid with a three-pane
workbench under a spectrum ribbon. Approved 2026-09-14 (approach "A + ribbon",
URL-persisted bench state, old grid deleted).

## Jobs the page answers

1. What capabilities does each platform in scope carry.
2. Who can talk to whom, at which tier, through which gateway; link variants
   are not interchangeable.
3. When platforms are removed, what is the force left with, and what is lost.
4. Which comms and sensing bands (HF through UV) the package covers.

## Page anatomy

```
Filter rail | Spectrum ribbon (comms lane · sensing lane)
            | Roster 280px | Coverage flex | Inspector 360px
```

Header stat chips are removed; the ribbon carries the headline counts.

### Roster
- Rows: side dot, short name, nation, best comms tier mark (T/D/V/–),
  sensor-gap mark when `sensors_status === 'gap'`.
- Primary gesture: ✕ benches a platform. Benched rows move to a "Benched (n)"
  tray with Restore and Restore all. Shift/cmd multi-select then "Bench
  selected".
- Sort: name, nation, tier.
- Bench state lives in the URL: `?tab=compare&bench=ID1,ID2` (comma-joined
  platform ids, URL-encoded). Missing param = nothing benched. Unknown ids are
  ignored silently.

### Coverage
Sections, in order: Comms nets, Radar bands, EO/IR bands, ESM, Other
capabilities (remaining rows from `matrix-model`).

Each row: label; bar segmented by force side (blue = accent, red = neutral
grey, neutral = muted); active count; ghost outline of the pre-bench length.
A row whose active count reaches zero because of benching takes the purple
attention gloss and lists "lost with: <benched names>". A row whose only
possible holders are gap platforms renders hatched "no data", not zero.

Sort: coverage (default), rarest, A–Z. Clicking a row opens it in the
Inspector.

### Inspector
Mode follows the last click.
- Platform: dossier. Sensors (bands, can/cannot detect, confidence, sources),
  bearers (standard, variant, band, gateway, comsec note), "Bench" button.
- Capability: holders list, each with a Bench button.
- Comms net: talk graph. D3-force cluster; nodes coloured by tier; edges via
  gateway dashed; islands ring-grouped; "GNSS denied" toggle re-runs
  `interopUnderDenial` and fades nodes that fall off. Two fits of the same
  standard with incompatible variants appear as separate islands.

### Spectrum ribbon
- Comms lane: log-scale MHz, spans from `BEARER_SPECTRUM`, fill height
  proportional to share of active roster using the net.
- Sensing lane: ordered categorical bands `HF VHF UHF L S C X Ku Ka | LWIR MWIR
  SWIR NIR VIS UV laser`, same fill rule from sensor bands.
- Hover a band: matching Coverage rows get band-focus (`data-band-state`).
  Click a band: Coverage filters to it (toggle).

## Data model (OSINT only; unknown stays unknown)

- `PlatformSensor.bands?: SensorBand[]` where `SensorBand = FreqBand | 'IR' |
  'VIS' | 'NIR' | 'SWIR' | 'MWIR' | 'LWIR' | 'UV' | 'laser'`. `band` stays as
  primary for back-compat; `bands` defaults to `[band]` when absent. Re-tag the
  32 EO/IR sensors only where a public source states the band.
- `CommsBearer.variant?: string` (`mids-jtrs`, `mids-lvt`, `link22-hf`,
  `link22-uhf`, `link11-hf`, …). `lib/coalition/link-variants.ts` holds a
  compatibility table: same standard and compatible variants share a net;
  otherwise gateway-only. Missing variant = compatible, and the inspector
  labels it "variant unknown".
- `sensors_status: 'listed' | 'gap'` derived per platform from
  `lib/force-catalog/data-gaps.ts`.

## Motion

Quiet register. Bar widths ease 250ms ease-out-quart; benched rows slide
200ms; talk graph settles with a damped simulation, no bounce; ribbon fill
250ms. `prefers-reduced-motion`: all instant. No load choreography.

## Modules

- `lib/force-catalog/coverage-model.ts` — pure. Input: platforms, bench set,
  interop result. Output: sections → rows {id, kind, label, band?, active,
  ghost, bySide, holders, lostWith, noData}. Tests.
- `lib/coalition/link-variants.ts` — variant compatibility; `interop.ts` net
  key becomes `std:<standard>[/<variant-group>]` behind the same API. Tests.
- `lib/force-catalog/bench-url.ts` — parse/serialise `bench` param. Tests.
- `components/force-catalog/workbench/` — `Workbench`, `Roster`, `Coverage`,
  `Inspector`, `SpectrumRibbon`, `TalkGraph`.
- `ForceCatalogClient` renders `Workbench` for `tab=compare`; pop-out route
  renders the same component.
- Delete `ForceCatalogMatrix.tsx`, the motion preview toggle, and the
  compare-only stat chips. Keep `matrix-model.ts` for the "Other capabilities"
  rows.

## Out of scope

Head-to-head diff of ≤6 platforms; endurance/payload numeric comparison;
editing data in the UI.
