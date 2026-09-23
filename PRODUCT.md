# Product

## Register

product

## Users

Defence analysts, EW/C-UAS planners, instructors and their students, and the sales lead demoing to a prospective customer. They work at a desk on a PROTECTED or air-gapped workstation, usually in a dim ops room or briefing space, for long sessions. The job on any screen is one of: look up a platform, compare a force package, plan a mission against a threat lay-down, or step a class through a scenario. They read hundreds of numbers per screen and act on a few.

## Product Purpose

SPECTRAL is a drone-threat and counter-UAS intelligence workbench: platform library, spectrum view, GNSS vulnerability, defeat matrix, conflict intel, a 3D wargame arena and mission planners. All data is OSINT with provenance shown. It is sold as a private per-customer instance, so first impressions happen in a live demo in front of a defence buyer. Success is an operator finding the right answer faster than in a spreadsheet, and a buyer believing it was built by a serious defence contractor.

## Brand Personality

Composed, exact, quiet. The interface is deep glossy black (Obsidian, see DESIGN.md): content sits on piano-black lacquer lit from above, and every control (sidebar, top bar, toolbars, segmented controls, table headers) is Apple Liquid Glass floating over it. The colour belongs to the data, never to the chrome; the only chrome accent is blue. Voice is terse military-technical English: nouns and units, no marketing. Reference feel: Apple Pro apps (Logic, Final Cut) and macOS Tahoe's glass for restraint and material; Bloomberg terminal for information per pixel without shouting.

## Anti-references

- The current `/force-catalog?tab=compare`: 2,000+ simultaneous controls, 9px text, every filter visible at once, banners stacked above the data.
- Palantir-style dashboards with a KPI tile row and gradient accents.
- Neon cyber/hacker green-on-black, glass on content panels (glass is for controls only), gradient text, side-stripe alerts.
- Orchestrated page-load animation sequences; anything that moves when the user did not act.

## Design Principles

- Colour is a data channel: hue means threat, band, allegiance or confidence, never decoration.
- One row of chrome, then the data. Advanced filters live behind a disclosure.
- Nothing smaller than 11px; tabular numerals for every value.
- Motion is state feedback (150–250ms, ease-out) plus one signature move per surface (band focus). Reduced-motion always honoured.
- Show provenance and uncertainty; never invent a spec, a Pk or a cost.

## Accessibility & Inclusion

WCAG 2.1 AA for text (4.5:1 body, 3:1 large) against #000000 and #1D1D1F surfaces. Keyboard-reachable filters and matrix cells; focus rings visible on black. `prefers-reduced-motion` replaces every animation with an instant or crossfade state. Classification banner is always present and never animated away.
