-- Correct the medium-range GBAD prototype row against the public record.
-- Defence (9 Jul 2026) and Defense News (23 Jul 2026): SM-2 fired from a towed
-- two-cell Derringer launcher, cued by a CEA radar through a software
-- ("virtualised") Aegis combat system, against a cruise-missile target at
-- Woomera during Taipan Strike 26 (June 2026). The row previously said MK 41
-- VLS, called SM-2 an Australian missile, described active radar homing and
-- listed an unsourced Ka-band seeker band. Idempotent.
update anti_drone_systems
set
  name = 'GBAD SM-2 / CEA-Aegis: Australian medium-range ground-based air defence (prototype)',
  manufacturer = 'CEA Technologies / Lockheed Martin / Raytheon (SM-2)',
  conflict_notes = 'Prototype medium-range ground-based air defence demonstrated at Woomera during Exercise Taipan Strike 26 (June 2026, announced 9 July 2026). A CEA Technologies radar cued a software (virtualised) Aegis combat system, and an SM-2 fired from a towed two-cell Derringer launcher intercepted a cruise-missile target. Candidate for the new medium-range GBAD (AIR 6502) that the 2026 National Defence Strategy directs Defence to accelerate. STATUS: prototype evaluation, not in ADF service. Sovereignty note: Australian radar (CEA) with US fire control (Aegis) and a US missile (SM-2, Raytheon). Range: about 166 km as reported by ABC News; treat as indicative. Fills the medium layer above NASAMS. Not rated against hypersonic terminal phase.',
  frequency_bands_covered = '{"CEA_radar_band": "not published"}'::jsonb,
  data_confidence = 'medium',
  sources = array[
    'Australian Department of Defence media release, 9 July 2026: Taipan Strike 26 SM-2 live fire',
    'Defense News, 23 July 2026: "Australia whips together a hybrid air defense weapon" (Derringer launcher, virtualised Aegis, CEA radar)',
    'Janes, 10 July 2026: Australia tests SM-2/Aegis ground-based air defence capability',
    'ABC News Australia, 9 July 2026: ADF missile interceptor test (166 km range cited)',
    '2026 National Defence Strategy and Integrated Investment Program (16 April 2026): medium-range GBAD acceleration'
  ]
where id = 'gbad-cea-sm2-aus';
